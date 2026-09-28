// Rielabora con il motore "Regia" i Reel già montati ma NON ancora pubblicati:
// riparte dal video grezzo originale (ancora su R2), rimonta il Reel e
// sostituisce solo il file video — didascalia, hashtag, data e orario
// programmati dagli agenti (Occhio -> Copy -> Editore) restano identici.
// I Reel già pubblicati non vengono toccati. I job finiti in errore tornano
// in coda (li riprende il Regista al prossimo giro).
//
// Si avvia dalla dashboard (pagina Anteprima -> "Rielabora con Regia") o da
// GitHub Actions: workflow "AI Reel Maker" con l'opzione "rielabora".
import "dotenv/config";
import path from "node:path";
import { rm } from "node:fs/promises";
import { readData, writeData, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { commitEPush } from "../lib/gitCommit.js";
import { IDENTITA } from "../agents/identities.js";
import { creaCartellaTemporanea, rimuoviCartella, scaricaDaR2, caricaSuR2 } from "../lib/videoTools.js";
import { montaConRegia, REGIA_VERSIONE } from "../lib/regiaEngine.js";
import type { ProfiloReel } from "../lib/reelPlanner.js";

interface Job {
  id: string; videoUrl: string; filename: string; mimeType: string; profilo: ProfiloReel;
  status: string; step: string; aggiornatoIl: string; erroreMessaggio: string | null;
  risultato: { reelUrl: string; durataSecondi: number; piano: unknown } | null; motore?: string;
}
interface QueueItem { id: string; formato: string; status: string; media: { mediaId: string | null; downloadUrl: string; filename: string } }
interface LibItem { id: string; url: string; usatoIl: string | null; mimeType: string }

const PUBBLICATI = new Set(["pubblicato", "pubblicato-parziale"]);

function estensione(mime: string, nome: string): string {
  const ext = path.extname(nome);
  if (ext) return ext;
  if (mime.includes("quicktime")) return ".mov";
  return ".mp4";
}

async function main() {
  const r2 = {
    accountId: process.env.R2_ACCOUNT_ID!, accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!, bucketName: process.env.R2_BUCKET_NAME!,
    dashboardPublicUrl: process.env.DASHBOARD_PUBLIC_URL!
  };
  if (!r2.accountId || !r2.accessKeyId || !r2.secretAccessKey || !r2.bucketName || !r2.dashboardPublicUrl) {
    throw new Error("Variabili R2 mancanti: impossibile rielaborare.");
  }
  const soloId = (process.env.RIELABORA_ID ?? "").trim(); // facoltativo: un solo job

  // job in errore -> di nuovo in coda per il Regista (ora con motore Regia)
  const jobsIniziali = await readData<{ _istruzioni: string; jobs: Job[] }>("reel-jobs.json");
  let rimessi = 0;
  for (const j of jobsIniziali.jobs) {
    if (j.status === "errore" && (!soloId || j.id === soloId)) {
      j.status = "in-coda-analisi"; j.step = "in-coda"; j.erroreMessaggio = null; j.risultato = null; j.aggiornatoIl = nowIso();
      rimessi++;
    }
  }
  if (rimessi) { await writeData("reel-jobs.json", jobsIniziali); await commitEPush(`chore(regia): ${rimessi} job in errore rimessi in coda`).catch(() => {}); }

  // bersagli: Reel non ancora pubblicati, montati col motore vecchio
  const queue = await readData<{ _istruzioni: string; queue: QueueItem[] }>("posts-queue.json");
  const lib = await readData<{ _istruzioni: string; items: LibItem[] }>("media-library.json");
  const bersagli = jobsIniziali.jobs.filter((j) => {
    if (soloId && j.id !== soloId) return false;
    if (!j.risultato || j.motore === REGIA_VERSIONE) return false;
    const inCoda = queue.queue.find((q) => q.media?.mediaId === j.id);
    if (inCoda) return !PUBBLICATI.has(inCoda.status);
    const inLib = lib.items.find((i) => i.id === j.id);
    return Boolean(inLib && !inLib.usatoIl);
  });
  console.log(`[Regia] Reel da rielaborare: ${bersagli.length} (job in errore rimessi in coda: ${rimessi})`);

  let ok = 0;
  const errori: string[] = [];
  for (const target of bersagli) {
    const cartella = await creaCartellaTemporanea("regia-rielabora-");
    try {
      console.log(`[Regia] → ${target.filename}`);
      const input = path.join(cartella, `input${estensione(target.mimeType, target.filename)}`);
      await scaricaDaR2(target.videoUrl, input, r2);
      const reg = await montaConRegia(input, target.profilo);
      const nuovoUrl = await caricaSuR2(reg.file, r2);
      await rm(path.dirname(reg.file), { recursive: true, force: true }).catch(() => {});

      // rilegge i file adesso (possono essere cambiati durante il montaggio) e aggiorna solo gli URL
      const jobs = await readData<{ _istruzioni: string; jobs: Job[] }>("reel-jobs.json");
      const q = await readData<{ _istruzioni: string; queue: QueueItem[] }>("posts-queue.json");
      const l = await readData<{ _istruzioni: string; items: LibItem[] }>("media-library.json");
      const job = jobs.jobs.find((j) => j.id === target.id);
      const qi = q.queue.find((x) => x.media?.mediaId === target.id);
      if (qi && PUBBLICATI.has(qi.status)) { console.log("[Regia]   già pubblicato nel frattempo: salto"); continue; }
      if (job?.risultato) { job.risultato = { ...job.risultato, reelUrl: nuovoUrl, durataSecondi: reg.durataSecondi }; job.motore = REGIA_VERSIONE; job.aggiornatoIl = nowIso(); }
      if (qi) qi.media.downloadUrl = nuovoUrl;
      const li = l.items.find((x) => x.id === target.id);
      if (li) li.url = nuovoUrl;
      await writeData("reel-jobs.json", jobs);
      await writeData("posts-queue.json", q);
      await writeData("media-library.json", l);
      await commitEPush(`chore(regia): Reel "${target.filename}" rielaborato con Regia`);
      ok++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errori.push(`${target.filename}: ${msg}`);
      console.error(`[Regia]   ERRORE ${msg}`);
    } finally {
      await rimuoviCartella(cartella);
    }
  }

  await logAgentRun({
    agente: IDENTITA.reelMaker.nome,
    identita: IDENTITA.reelMaker.ruolo,
    status: errori.length && !ok ? "errore" : bersagli.length || rimessi ? "ok" : "nessuna-azione",
    riepilogo: `Rielaborazione con Regia: ${ok}/${bersagli.length} Reel rimontati (didascalie e orari invariati)${rimessi ? `, ${rimessi} job in errore rimessi in coda` : ""}.`,
    ...(errori.length ? { dettagli: { errori } } : {})
  });
  await commitEPush("chore(regia): registro rielaborazione").catch(() => {});
}

main().catch((err) => { console.error(err); process.exit(1); });
