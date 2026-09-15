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

    const risultatoIg = await pubblicaSuInstagram({
      imageUrl: isVideo ? undefined : target.media.downloadUrl,
      videoUrl: isVideo ? target.media.downloadUrl : undefined,
      isReel: target.formato === "reel",
      caption
    });

    const risultatoFb = await pubblicaSuFacebook({
      message: caption,
      imageUrl: isVideo ? undefined : target.media.downloadUrl,
      videoUrl: isVideo ? target.media.downloadUrl : undefined
    });

    target.status = "pubblicato";

    const logFile = await readData<PublishedLogFile>("published-log.json");
    logFile.log.unshift({
      queueId: target.id,
      timestamp: nowIso(),
      instagramId: risultatoIg.id,
      facebookId: risultatoFb.id,
      formato: target.formato,
      pillarId: target.pillarId ?? null
    });
    await writeData("published-log.json", logFile);
    await writeData("posts-queue.json", queueFile);

    await logAgentRun({
      agente: IDENTITA.publishing.nome,
      identita: IDENTITA.publishing.ruolo,
      status: "ok",
      riepilogo: `Pubblicato su Instagram (${risultatoIg.id}) e Facebook (${risultatoFb.id}).`
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
