// Agente "Occhio" — sceglie il prossimo media caricato dalla dashboard
// (pagina "Carica media") e apre una nuova voce in coda (senza ancora
// didascalia: ci pensa l'Agente Contenuti subito dopo, nello stesso run
// del Master).
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readData, writeData, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { IDENTITA } from "./identities.js";

interface MediaLibraryItem {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  uploadedAt: string;
  usatoIl: string | null;
}

interface MediaLibraryFile {
  _istruzioni: string;
  items: MediaLibraryItem[];
}

interface PostsQueueFile {
  _istruzioni: string;
  queue: Array<Record<string, unknown>>;
}

export async function eseguiMediaAgent(): Promise<void> {
  try {
    const libreria = await readData<MediaLibraryFile>("media-library.json");
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

    const prossimo = libreria.items.find((m) => m.usatoIl === null);

    if (!prossimo) {
      await logAgentRun({
        agente: IDENTITA.media.nome,
        identita: IDENTITA.media.ruolo,
        status: "nessuna-azione",
        riepilogo: "Nessun nuovo media disponibile: carica nuove foto/video dalla pagina 'Carica media' della dashboard."
      });
      return;
    }

    const isVideo = prossimo.mimeType.startsWith("video/");
    queueFile.queue.push({
      id: randomUUID(),
      createdAt: nowIso(),
      formato: isVideo ? "reel" : "post",
      media: {
        source: "dashboard-upload",
        mediaId: prossimo.id,
        filename: prossimo.filename,
        mimeType: prossimo.mimeType,
        downloadUrl: prossimo.url
      },
      caption: null,
      hashtags: [],
      orarioProgrammato: null,
      status: "in-coda-caption"
    });
    await writeData("posts-queue.json", queueFile);

    prossimo.usatoIl = nowIso();
    await writeData("media-library.json", libreria);

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
