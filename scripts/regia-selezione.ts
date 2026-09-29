// Rielabora con Regia SOLO i contenuti scelti in dashboard (pagina Anteprima:
// caselle "Regia" + "Rielabora selezionati"). La dashboard segna ogni
// contenuto scelto con il campo "regiaRichiesta" in posts-queue.json; qui:
// - immagini (foto, card testimonianza, screenshot del sito): nuovo Reel
//   dall'immagine originale, con un brano diverso ogni volta;
// - video: rimontati dal video grezzo originale (ancora su R2).
// Didascalia, hashtag, data e orario restano quelli già decisi; i contenuti
// già pubblicati non vengono toccati. Gira a ogni esecuzione di "AI Reel
// Maker": la richiesta resta salvata nei dati finché non è evasa, quindi non
// si perde anche se GitHub salta o accorpa un'esecuzione.
import "dotenv/config";
import path from "node:path";
import { writeFile, rm } from "node:fs/promises";
import { readData, writeData, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { IDENTITA } from "../agents/identities.js";
import { creaCartellaTemporanea, rimuoviCartella, scaricaDaR2, caricaSuR2 } from "../lib/videoTools.js";
import { montaConRegia, creaReelDaImmagine, REGIA_VERSIONE, REGIA_FOTO_VERSIONE, type TipoImmagine } from "../lib/regiaEngine.js";
import { applicaESalva } from "../lib/regiaSalva.js";
import type { ProfiloReel } from "../lib/reelPlanner.js";

interface QueueItem {
  id: string; formato: string; status: string; dataProgrammata?: string | null; orarioProgrammato?: string | null;
  regiaRichiesta?: string; regiaErrore?: string;
  media: {
    source?: string; mediaId: string | null; filename: string; mimeType: string; downloadUrl: string;
    fotoReel?: string; originale?: { downloadUrl: string; mimeType: string; filename: string };
  };
}
type QueueFile = { _istruzioni: string; queue: QueueItem[] };
interface Job {
  id: string; videoUrl: string; filename: string; mimeType: string; profilo: ProfiloReel;
  aggiornatoIl: string; risultato: { reelUrl: string; durataSecondi: number; piano: unknown } | null; motore?: string;
}
type JobsFile = { _istruzioni: string; jobs: Job[] };
interface LibItem { id: string; url: string }
type LibFile = { _istruzioni: string; items: LibItem[] };

const PUBBLICATI = new Set(["pubblicato", "pubblicato-parziale"]);
const MASSIMO_PER_ESECUZIONE = 8; // gli altri scelti restano in attesa per il giro dopo

function tipoDi(item: QueueItem): TipoImmagine {
  if (item.media.source === "testimonianza") return "testimonianza";
  if (item.formato === "sito" || item.media.source === "sito-web") return "sito";
  return "foto";
}

function estensione(mime: string, nome: string): string {
  const ext = path.extname(nome);
  if (ext) return ext;
  if (mime.includes("quicktime")) return ".mov";
  if (mime.includes("png")) return ".png";
  if (mime.startsWith("image/")) return ".jpg";
  return ".mp4";
}

type Esito =
  | { id: string; tipo: "immagine"; url: string }
  | { id: string; tipo: "video"; url: string; jobId: string; durata: number }
  | { id: string; tipo: "errore"; messaggio: string };

async function main() {
  const r2 = {
    accountId: process.env.R2_ACCOUNT_ID!, accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!, bucketName: process.env.R2_BUCKET_NAME!,
    dashboardPublicUrl: process.env.DASHBOARD_PUBLIC_URL!
  };

  const coda = await readData<QueueFile>("posts-queue.json");
  const bersagli = coda.queue
    .filter((p) => p.regiaRichiesta && !PUBBLICATI.has(p.status))
    .sort((a, b) => (a.regiaRichiesta ?? "").localeCompare(b.regiaRichiesta ?? ""))
    .slice(0, MASSIMO_PER_ESECUZIONE);
  console.log(`[Regia] Contenuti scelti da rielaborare: ${bersagli.length}`);
  if (!bersagli.length) return;
  if (!r2.accountId || !r2.accessKeyId || !r2.secretAccessKey || !r2.bucketName || !r2.dashboardPublicUrl) {
    throw new Error("Variabili R2 mancanti: impossibile rielaborare.");
  }
  const jobs = await readData<JobsFile>("reel-jobs.json");

  const esiti: Esito[] = [];
  for (const target of bersagli) {
    const cartella = await creaCartellaTemporanea("regia-scelti-");
    try {
      const immagine = target.media.originale ?? (target.media.mimeType.startsWith("image/") ? target.media : null);
      if (immagine) {
        const tipo = tipoDi(target);
        console.log(`[Regia] → ${immagine.filename} (${tipo})`);
        const res = await fetch(immagine.downloadUrl);
        if (!res.ok) throw new Error(`Download immagine fallito (${res.status})`);
        const input = path.join(cartella, `immagine${estensione(immagine.mimeType, immagine.filename)}`);
        await writeFile(input, Buffer.from(await res.arrayBuffer()));
        // seed nuovo a ogni richiesta: di solito cambia anche il brano
        const reel = await creaReelDaImmagine(input, tipo, console.log, `${target.id}-${Date.now()}`);
        const url = await caricaSuR2(reel.file, r2);
        await rm(path.dirname(reel.file), { recursive: true, force: true }).catch(() => {});
        esiti.push({ id: target.id, tipo: "immagine", url });
        continue;
      }
      const job = jobs.jobs.find((j) => j.id === target.media.mediaId);
      if (!job?.videoUrl) throw new Error("Video originale non trovato: questo contenuto non si può rimontare.");
      console.log(`[Regia] → ${job.filename} (video, profilo ${job.profilo})`);
      const input = path.join(cartella, `input${estensione(job.mimeType, job.filename)}`);
      await scaricaDaR2(job.videoUrl, input, r2);
      const reg = await montaConRegia(input, job.profilo);
      const url = await caricaSuR2(reg.file, r2);
      await rm(path.dirname(reg.file), { recursive: true, force: true }).catch(() => {});
      esiti.push({ id: target.id, tipo: "video", url, jobId: job.id, durata: reg.durataSecondi });
    } catch (err) {
      const messaggio = (err instanceof Error ? err.message : String(err)).slice(0, 300);
      console.error(`[Regia]   ERRORE ${messaggio}`);
      esiti.push({ id: target.id, tipo: "errore", messaggio });
    } finally {
      await rimuoviCartella(cartella);
    }
  }

  // Un solo salvataggio per tutto il giro, rileggendo i dati più recenti a ogni tentativo
  let ok = 0;
  const errori = esiti.filter((e): e is Extract<Esito, { tipo: "errore" }> => e.tipo === "errore");
  await applicaESalva(`chore(regia): ${esiti.length - errori.length} contenuti scelti rielaborati con Regia`, async () => {
    const q = await readData<QueueFile>("posts-queue.json");
    const j = await readData<JobsFile>("reel-jobs.json");
    const l = await readData<LibFile>("media-library.json");
    ok = 0;
    for (const e of esiti) {
      const it = q.queue.find((x) => x.id === e.id);
      if (!it) continue;
      delete it.regiaRichiesta;
      if (PUBBLICATI.has(it.status)) continue; // pubblicato nel frattempo: lasciato com'era
      if (e.tipo === "errore") { it.regiaErrore = e.messaggio; continue; }
      delete it.regiaErrore;
      if (e.tipo === "immagine") {
        if (!it.media.originale) it.media.originale = { downloadUrl: it.media.downloadUrl, mimeType: it.media.mimeType, filename: it.media.filename };
        it.media.downloadUrl = e.url;
        it.media.mimeType = "video/mp4";
        it.media.filename = `reel-${it.media.originale.filename.replace(/\.[^.]+$/, "")}.mp4`;
        it.media.fotoReel = REGIA_FOTO_VERSIONE;
        if (it.formato === "post") it.formato = "reel";
      } else {
        it.media.downloadUrl = e.url;
        const job = j.jobs.find((x) => x.id === e.jobId);
        if (job?.risultato) { job.risultato = { ...job.risultato, reelUrl: e.url, durataSecondi: e.durata }; job.motore = REGIA_VERSIONE; job.aggiornatoIl = nowIso(); }
        const li = l.items.find((x) => x.id === e.jobId);
        if (li) li.url = e.url;
      }
      ok++;
    }
    await writeData("posts-queue.json", q);
    await writeData("reel-jobs.json", j);
    await writeData("media-library.json", l);
    await logAgentRun({
      agente: IDENTITA.reelMaker.nome,
      identita: IDENTITA.reelMaker.ruolo,
      status: errori.length && !ok ? "errore" : "ok",
      riepilogo: `Rielaborazione scelta dalla dashboard: ${ok}/${esiti.length} contenuti rimontati con Regia (didascalie e orari invariati).`,
      ...(errori.length ? { dettagli: { errori: errori.map((e) => `${e.id}: ${e.messaggio}`), quando: nowIso() } } : {})
    });
    return true;
  });
}

main().catch((err) => { console.error(err); process.exit(1); });
