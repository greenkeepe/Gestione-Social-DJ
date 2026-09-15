// Agente "Occhio" — sceglie il prossimo media dall'album Google Photos e
// apre una nuova voce in coda (senza ancora didascalia: ci pensa l'Agente
// Contenuti subito dopo, nello stesso run del Master).
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readData, writeData, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { elencaMediaAlbum, urlDownloadDiretto, type MediaItemGooglePhotos } from "../lib/googlePhotos.js";
import { IDENTITA } from "./identities.js";

interface MediaIndexFile {
  _istruzioni: string;
  album: string | null;
  items: Array<{ id: string; filename: string; usatoIl: string | null }>;
}

interface PostsQueueFile {
  _istruzioni: string;
  queue: Array<Record<string, unknown>>;
}

export async function eseguiMediaAgent(): Promise<void> {
  try {
    const mediaIndex = await readData<MediaIndexFile>("media-index.json");
    const queueFile = await readData<PostsQueueFile>("posts-queue.json");

    const cePostaInAttesaDiMedia = queueFile.queue.some((p) => p.status === "in-coda-caption");
    if (cePostaInAttesaDiMedia) {
      await logAgentRun({
        agente: IDENTITA.media.nome,
        identita: IDENTITA.media.ruolo,
        status: "nessuna-azione",
        riepilogo: "C'è già un contenuto in coda in attesa di didascalia, non serve selezionare altro media oggi."
      });
      return;
    }

    let itemsRemoti: MediaItemGooglePhotos[] = [];
    try {
      itemsRemoti = await elencaMediaAlbum();
    } catch (err) {
      await logAgentRun({
        agente: IDENTITA.media.nome,
        identita: IDENTITA.media.ruolo,
        status: "errore",
        riepilogo: "Impossibile leggere l'album Google Photos. Controlla le credenziali GOOGLE_* nei secrets.",
        dettagli: { errore: String(err) }
      });
      return;
    }

    const idGiaUsati = new Set(mediaIndex.items.filter((i) => i.usatoIl !== null).map((i) => i.id));
    const prossimo = itemsRemoti.find((m) => !idGiaUsati.has(m.id));

    if (!prossimo) {
      await logAgentRun({
        agente: IDENTITA.media.nome,
        identita: IDENTITA.media.ruolo,
        status: "nessuna-azione",
        riepilogo: "Nessun nuovo media disponibile nell'album: tutti i contenuti presenti sono già stati usati. Aggiungi nuove foto/video alla cartella Google Photos dedicata."
      });
      return;
    }

    const isVideo = prossimo.mimeType.startsWith("video/");
    queueFile.queue.push({
      id: randomUUID(),
      createdAt: nowIso(),
      formato: isVideo ? "reel" : "post",
      media: {
        source: "google-photos",
        mediaId: prossimo.id,
        filename: prossimo.filename,
        mimeType: prossimo.mimeType,
        downloadUrl: urlDownloadDiretto(prossimo)
      },
      caption: null,
      hashtags: [],
      orarioProgrammato: null,
      status: "in-coda-caption"
    });
    await writeData("posts-queue.json", queueFile);

    mediaIndex.album = mediaIndex.album ?? process.env.GOOGLE_PHOTOS_ALBUM_ID ?? null;
    const esistente = mediaIndex.items.find((i) => i.id === prossimo.id);
    if (esistente) {
      esistente.usatoIl = nowIso();
    } else {
      mediaIndex.items.push({ id: prossimo.id, filename: prossimo.filename, usatoIl: nowIso() });
    }
    await writeData("media-index.json", mediaIndex);

    await logAgentRun({
      agente: IDENTITA.media.nome,
      identita: IDENTITA.media.ruolo,
      status: "ok",
      riepilogo: `Selezionato nuovo media "${prossimo.filename}" (${isVideo ? "video/reel" : "foto"}) e messo in coda per la didascalia.`
    });
  } catch (err) {
    await logAgentRun({
      agente: IDENTITA.media.nome,
      identita: IDENTITA.media.ruolo,
      status: "errore",
      riepilogo: "Errore imprevisto nell'Agente Media.",
      dettagli: { errore: String(err) }
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiMediaAgent();
}
