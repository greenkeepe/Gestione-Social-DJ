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
import { execFile } from "node:child_process";
import { promisify } from "node:util";
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

const git = promisify(execFile);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Salvataggio a prova di concorrenza: gli altri agenti (Copy, Editore, ciclo
// giornaliero) scrivono sugli stessi file data/*.json mentre qui si monta.
// Invece di un rebase che può andare in conflitto, a ogni tentativo si
// riparte dall'ultima versione remota, si riapplica SOLO la nostra modifica
// (rileggendo i file) e si invia subito. In locale (fuori da GitHub Actions)
// scrive solo i file, senza git.
async function applicaESalva(messaggio: string, modifica: () => Promise<boolean>): Promise<void> {
  const branch = process.env.GITHUB_REF_NAME;
  if (!branch) { await modifica(); return; }
  await git("git", ["config", "user.name", "gestione-social-dj-bot"]).catch(() => {});
  await git("git", ["config", "user.email", "actions@users.noreply.github.com"]).catch(() => {});
  for (let tentativo = 0; tentativo < 8; tentativo++) {
    await git("git", ["fetch", "-q", "origin", branch]);
    await git("git", ["reset", "-q", "--hard", `origin/${branch}`]);
    if (!(await modifica())) return; // niente da cambiare (es. già pubblicato nel frattempo)
    await git("git", ["add", "data/"]);
    const cambiato = await git("git", ["diff", "--cached", "--quiet"]).then(() => false).catch(() => true);
    if (!cambiato) return;
    await git("git", ["commit", "-q", "-m", messaggio]);
    try { await git("git", ["push", "-q", "origin", `HEAD:${branch}`]); return; }
    catch { await sleep(2000 + Math.random() * 6000); }
  }
  throw new Error(`Salvataggio non riuscito dopo 8 tentativi: ${messaggio}`);
}

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
  let rimessi = 0;
  await applicaESalva("chore(regia): job in errore rimessi in coda", async () => {
    const jobs = await readData<{ _istruzioni: string; jobs: Job[] }>("reel-jobs.json");
    rimessi = 0;
    for (const j of jobs.jobs) {
      if (j.status === "errore" && (!soloId || j.id === soloId)) {
        j.status = "in-coda-analisi"; j.step = "in-coda"; j.erroreMessaggio = null; j.risultato = null; j.aggiornatoIl = nowIso();
        rimessi++;
      }
    }
    if (rimessi) await writeData("reel-jobs.json", jobs);
    return rimessi > 0;
  });

  // bersagli: Reel non ancora pubblicati, montati col motore vecchio
  const jobsIniziali = await readData<{ _istruzioni: string; jobs: Job[] }>("reel-jobs.json");
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

      // sostituisce solo gli URL del video, rileggendo i file più recenti ad ogni tentativo
      let saltato = false;
      await applicaESalva(`chore(regia): Reel "${target.filename}" rielaborato con Regia`, async () => {
        const jobs = await readData<{ _istruzioni: string; jobs: Job[] }>("reel-jobs.json");
        const q = await readData<{ _istruzioni: string; queue: QueueItem[] }>("posts-queue.json");
        const l = await readData<{ _istruzioni: string; items: LibItem[] }>("media-library.json");
        const qi = q.queue.find((x) => x.media?.mediaId === target.id);
        if (qi && PUBBLICATI.has(qi.status)) { saltato = true; return false; }
        const job = jobs.jobs.find((j) => j.id === target.id);
        if (job?.risultato) { job.risultato = { ...job.risultato, reelUrl: nuovoUrl, durataSecondi: reg.durataSecondi }; job.motore = REGIA_VERSIONE; job.aggiornatoIl = nowIso(); }
        if (qi) qi.media.downloadUrl = nuovoUrl;
        const li = l.items.find((x) => x.id === target.id);
        if (li) li.url = nuovoUrl;
        await writeData("reel-jobs.json", jobs);
        await writeData("posts-queue.json", q);
        await writeData("media-library.json", l);
        return true;
      });
      if (saltato) console.log("[Regia]   già pubblicato nel frattempo: lasciato com'era");
      else ok++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errori.push(`${target.filename}: ${msg.slice(0, 600)}`);
      console.error(`[Regia]   ERRORE ${msg}`);
    } finally {
      await rimuoviCartella(cartella);
    }
  }

  await applicaESalva("chore(regia): registro rielaborazione", async () => {
    await logAgentRun({
      agente: IDENTITA.reelMaker.nome,
      identita: IDENTITA.reelMaker.ruolo,
      status: errori.length && !ok ? "errore" : bersagli.length || rimessi ? "ok" : "nessuna-azione",
      riepilogo: `Rielaborazione con Regia: ${ok}/${bersagli.length} Reel rimontati (didascalie e orari invariati)${rimessi ? `, ${rimessi} job in errore rimessi in coda` : ""}.`,
      ...(errori.length ? { dettagli: { errori } } : {})
    });
    return true;
  });
}

main().catch((err) => { console.error(err); process.exit(1); });
