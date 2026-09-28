// Trasforma in Reel (con il motore Regia) i contenuti con IMMAGINI in coda e
// non ancora pubblicati: foto caricate, card testimonianza, screenshot del
// sito. Musica libera da diritti (regia/ASSETS/musica), zoom e panoramiche,
// transizioni sul beat, look e schermata finale con i contatti Forte DJ.
// Didascalia, hashtag, data e orario restano quelli decisi dagli agenti;
// l'immagine originale resta salvata in media.originale (per tornare indietro).
//
// Gira a ogni esecuzione del workflow "AI Reel Maker" (ogni ~20 minuti):
// così anche le foto caricate in futuro diventano Reel da sole.
import "dotenv/config";
import path from "node:path";
import { writeFile, rm } from "node:fs/promises";
import { readData, writeData, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { IDENTITA } from "../agents/identities.js";
import { creaCartellaTemporanea, rimuoviCartella, caricaSuR2 } from "../lib/videoTools.js";
import { creaReelDaImmagine, REGIA_FOTO_VERSIONE, type TipoImmagine } from "../lib/regiaEngine.js";
import { applicaESalva } from "../lib/regiaSalva.js";

interface QueueItem {
  id: string; formato: string; status: string; dataProgrammata?: string | null; orarioProgrammato?: string | null;
  media: {
    source?: string; mediaId: string | null; filename: string; mimeType: string; downloadUrl: string;
    fotoReel?: string; originale?: { downloadUrl: string; mimeType: string; filename: string };
  };
}
type QueueFile = { _istruzioni: string; queue: QueueItem[] };

const PUBBLICATI = new Set(["pubblicato", "pubblicato-parziale"]);
const MASSIMO_PER_ESECUZIONE = 10;

function tipoDi(item: QueueItem): TipoImmagine {
  if (item.media.source === "testimonianza") return "testimonianza";
  if (item.formato === "sito" || item.media.source === "sito-web") return "sito";
  return "foto";
}

async function main() {
  if ((process.env.REEL_DA_FOTO ?? "si").trim().toLowerCase() === "no") {
    console.log("[Regia] Reel da foto disattivati (REEL_DA_FOTO=no)");
    return;
  }
  const r2 = {
    accountId: process.env.R2_ACCOUNT_ID!, accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!, bucketName: process.env.R2_BUCKET_NAME!,
    dashboardPublicUrl: process.env.DASHBOARD_PUBLIC_URL!
  };
  if (!r2.accountId || !r2.accessKeyId || !r2.secretAccessKey || !r2.bucketName || !r2.dashboardPublicUrl) {
    throw new Error("Variabili R2 mancanti: impossibile creare i Reel da foto.");
  }

  const coda = await readData<QueueFile>("posts-queue.json");
  const chiave = (p: QueueItem) => `${p.dataProgrammata ?? "9999-99-99"} ${p.orarioProgrammato ?? "99:99"}`;
  const bersagli = coda.queue
    .filter((p) => !PUBBLICATI.has(p.status) && p.media?.mimeType?.startsWith("image/") && !p.media.fotoReel)
    .sort((a, b) => chiave(a).localeCompare(chiave(b)))
    .slice(0, MASSIMO_PER_ESECUZIONE);
  console.log(`[Regia] Contenuti con immagini da trasformare in Reel: ${bersagli.length}`);
  if (!bersagli.length) return;

  // Un solo salvataggio a fine giro (non uno per contenuto): ogni commit sul
  // repository fa partire un deploy Vercel, e il piano gratuito ne ha 100 al giorno.
  const pronti: Array<{ id: string; url: string }> = [];
  const errori: string[] = [];
  for (const target of bersagli) {
    const tipo = tipoDi(target);
    const cartella = await creaCartellaTemporanea("regia-foto-");
    try {
      console.log(`[Regia] → ${target.media.filename} (${tipo})`);
      const res = await fetch(target.media.downloadUrl);
      if (!res.ok) throw new Error(`Download immagine fallito (${res.status})`);
      const ext = path.extname(target.media.filename) || (target.media.mimeType.includes("png") ? ".png" : ".jpg");
      const input = path.join(cartella, `immagine${ext}`);
      await writeFile(input, Buffer.from(await res.arrayBuffer()));

      const reel = await creaReelDaImmagine(input, tipo);
      const nuovoUrl = await caricaSuR2(reel.file, r2);
      await rm(path.dirname(reel.file), { recursive: true, force: true }).catch(() => {});

      pronti.push({ id: target.id, url: nuovoUrl });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errori.push(`${target.media.filename}: ${msg.slice(0, 600)}`);
      console.error(`[Regia]   ERRORE ${msg}`);
    } finally {
      await rimuoviCartella(cartella);
    }
  }

  let ok = 0;
  await applicaESalva(`chore(regia): ${pronti.length} contenuti con immagini trasformati in Reel`, async () => {
    const q = await readData<QueueFile>("posts-queue.json");
    ok = 0;
    for (const p of pronti) {
      const it = q.queue.find((x) => x.id === p.id);
      if (!it || PUBBLICATI.has(it.status) || !it.media.mimeType.startsWith("image/")) continue; // pubblicato nel frattempo
      it.media.originale = { downloadUrl: it.media.downloadUrl, mimeType: it.media.mimeType, filename: it.media.filename };
      it.media.downloadUrl = p.url;
      it.media.mimeType = "video/mp4";
      it.media.filename = `reel-${it.media.filename.replace(/\.[^.]+$/, "")}.mp4`;
      it.media.fotoReel = REGIA_FOTO_VERSIONE;
      if (it.formato === "post") it.formato = "reel";
      ok++;
    }
    if (ok) await writeData("posts-queue.json", q);
    await logAgentRun({
      agente: IDENTITA.reelMaker.nome,
      identita: IDENTITA.reelMaker.ruolo,
      status: errori.length && !ok ? "errore" : "ok",
      riepilogo: `Reel da immagini con Regia: ${ok}/${bersagli.length} contenuti trasformati in Reel (musica, transizioni, finale con contatti; didascalie e orari invariati).`,
      ...(errori.length ? { dettagli: { errori, quando: nowIso() } } : {})
    });
    return true;
  });
}

main().catch((err) => { console.error(err); process.exit(1); });
