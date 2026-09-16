// Agente "Editore" — pubblica su Instagram e Facebook SOLO quando l'orario
// corrente è vicino all'orario programmato per il contenuto pronto in coda,
// ed evita doppie pubblicazioni nello stesso giorno. Pensato per essere
// eseguito più volte al giorno (vedi .github/workflows/publish-check.yml)
// così da "trovare" l'orario migliore invece di pubblicare a un'ora fissa.
import "dotenv/config";
import { readData, writeData, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { pubblicaSuInstagram, pubblicaSuFacebook } from "../lib/metaGraph.js";
import { IDENTITA } from "./identities.js";

interface PostsQueueFile {
  _istruzioni: string;
  queue: Array<{
    id: string;
    formato: string;
    status: string;
    caption: string | null;
    hashtags: string[];
    orarioProgrammato: string | null;
    media: { downloadUrl: string; mimeType: string };
    pillarId?: string;
  }>;
}

interface PublishedLogFile {
  _istruzioni: string;
  log: Array<Record<string, unknown>>;
}

const FINESTRA_TOLLERANZA_MINUTI = 90;

function siamoNellaFinestra(orarioProgrammato: string): boolean {
  const ora = new Date();
  const [hh, mm] = orarioProgrammato.split(":").map(Number);
  const target = new Date(ora);
  target.setHours(hh, mm, 0, 0);
  const diffMinuti = (ora.getTime() - target.getTime()) / 60000;
  // pubblichiamo se siamo AL o DOPO l'orario target, ma entro la finestra di tolleranza
  return diffMinuti >= 0 && diffMinuti <= FINESTRA_TOLLERANZA_MINUTI;
}

export async function eseguiPublishingAgent(): Promise<void> {
  try {
    const queueFile = await readData<PostsQueueFile>("posts-queue.json");
    const oggi = new Date().toISOString().slice(0, 10);

    const pubblicatoOggi = (await readData<PublishedLogFile>("published-log.json")).log.some(
      (p) => typeof p.timestamp === "string" && p.timestamp.startsWith(oggi)
    );
    if (pubblicatoOggi) {
      await logAgentRun({
        agente: IDENTITA.publishing.nome,
        identita: IDENTITA.publishing.ruolo,
        status: "nessuna-azione",
        riepilogo: "Già pubblicato un contenuto oggi, evito doppie pubblicazioni."
      });
      return;
    }

    const target = queueFile.queue.find((p) => p.status === "pronto" && p.orarioProgrammato);
    if (!target) {
      await logAgentRun({
        agente: IDENTITA.publishing.nome,
        identita: IDENTITA.publishing.ruolo,
        status: "nessuna-azione",
        riepilogo: "Nessun contenuto pronto in coda."
      });
      return;
    }

    if (!siamoNellaFinestra(target.orarioProgrammato!)) {
      await logAgentRun({
        agente: IDENTITA.publishing.nome,
        identita: IDENTITA.publishing.ruolo,
        status: "nessuna-azione",
        riepilogo: `In attesa dell'orario migliore (${target.orarioProgrammato}) per pubblicare.`
      });
      return;
    }

    const isVideo = target.media.mimeType.startsWith("video/");
    const caption = `${target.caption ?? ""}\n\n${(target.hashtags ?? []).join(" ")}`.trim();

    // Instagram e Facebook sono chiamati SEPARATAMENTE (mai il secondo dentro
    // lo stesso try del primo): se una delle due piattaforme fallisce dopo che
    // l'altra è già andata a buon fire, quel post è REALMENTE uscito e non va
    // mai più ritentato, altrimenti al ciclo successivo lo pubblicheremmo una
    // seconda volta sulla piattaforma che aveva già funzionato.
    let risultatoIg: { id: string } | null = null;
    let erroreIg: string | null = null;
    try {
      risultatoIg = await pubblicaSuInstagram({
        imageUrl: isVideo ? undefined : target.media.downloadUrl,
        videoUrl: isVideo ? target.media.downloadUrl : undefined,
        isReel: target.formato === "reel",
        caption
      });
    } catch (err) {
      erroreIg = err instanceof Error ? err.message : String(err);
    }

    let risultatoFb: { id: string } | null = null;
    let erroreFb: string | null = null;
    try {
      risultatoFb = await pubblicaSuFacebook({
        message: caption,
        imageUrl: isVideo ? undefined : target.media.downloadUrl,
        videoUrl: isVideo ? target.media.downloadUrl : undefined
      });
    } catch (err) {
      erroreFb = err instanceof Error ? err.message : String(err);
    }

    if (!risultatoIg && !risultatoFb) {
      // Nessuna pubblicazione è uscita davvero: il contenuto resta "pronto"
      // e si può ritentare tranquillamente al prossimo ciclo.
      throw new Error(`Instagram: ${erroreIg}. Facebook: ${erroreFb}`);
    }

    // Almeno una pubblicazione è uscita: il contenuto NON deve più tornare
    // "pronto", altrimenti verrebbe ripubblicato in doppione sulla
    // piattaforma che ha già funzionato.
    target.status = risultatoIg && risultatoFb ? "pubblicato" : "pubblicato-parziale";

    const logFile = await readData<PublishedLogFile>("published-log.json");
    logFile.log.unshift({
      queueId: target.id,
      timestamp: nowIso(),
      instagramId: risultatoIg?.id ?? null,
      facebookId: risultatoFb?.id ?? null,
      formato: target.formato,
      pillarId: target.pillarId ?? null
    });
    await writeData("published-log.json", logFile);
    await writeData("posts-queue.json", queueFile);

    const completo = Boolean(risultatoIg && risultatoFb);
    const dettaglioIg = risultatoIg ? `Instagram OK (${risultatoIg.id})` : `Instagram FALLITO: ${erroreIg}`;
    const dettaglioFb = risultatoFb ? `Facebook OK (${risultatoFb.id})` : `Facebook FALLITO: ${erroreFb}`;

    await logAgentRun({
      agente: IDENTITA.publishing.nome,
      identita: IDENTITA.publishing.ruolo,
      status: completo ? "ok" : "errore",
      riepilogo: completo
        ? `Pubblicato su Instagram (${risultatoIg!.id}) e Facebook (${risultatoFb!.id}).`
        : `Pubblicazione PARZIALE, richiede la tua attenzione — ${dettaglioIg}; ${dettaglioFb}`
    });
  } catch (err) {
    await logAgentRun({
      agente: IDENTITA.publishing.nome,
      identita: IDENTITA.publishing.ruolo,
      status: "errore",
      riepilogo: "Errore imprevisto nell'Agente Pubblicazione. Il contenuto resta in coda per il prossimo tentativo.",
      dettagli: { errore: String(err) }
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiPublishingAgent();
}
