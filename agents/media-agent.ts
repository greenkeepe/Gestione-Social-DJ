// Agente "Occhio" — sceglie il prossimo media caricato dalla dashboard
// (pagina "Carica media") e apre una nuova voce in coda (senza ancora
// didascalia: ci pensa l'Agente Contenuti subito dopo, nello stesso run
// del Master). A ogni ciclo c'è anche una probabilità casuale (indipendente
// da cosa c'è già in coda) di generare invece un post-cartolina da una
// recensione reale, a rotazione, mai ripetuta finché non sono passate tutte.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readData, writeData, readBrand, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { inviaMessaggioTelegram } from "../lib/telegram.js";
import { IDENTITA } from "./identities.js";
import { pianificaProssimaPubblicazione } from "../lib/bestTime.js";
import { generaCartTestimonianza, type Testimonianza } from "../lib/testimonialCard.js";
import { caricaBufferSuR2 } from "../lib/r2Upload.js";
import { costruisciHashtag, testoCtaContatto } from "./content-agent.js";

interface MediaLibraryItem {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  uploadedAt: string;
  usatoIl: string | null;
  source?: string;
  istruzioniUtente?: string | null;
}

interface MediaLibraryFile {
  _istruzioni: string;
  items: MediaLibraryItem[];
}

interface PostsQueueFile {
  _istruzioni: string;
  queue: Array<Record<string, unknown>>;
}

interface BrandFile {
  nomeArte?: string;
  toneOfVoice?: Record<string, unknown>;
  contatti?: Record<string, unknown>;
  testimonianze?: Testimonianza[];
}

interface TestimonianzeUsateFile {
  _istruzioni: string;
  usate: string[];
}

const INTRO_TESTIMONIANZE = [
  "Le parole più belle sono quelle di chi c'era, grazie davvero.",
  "Niente vale più le parole di chi ha vissuto la serata con noi.",
  "Recensioni così sono il motivo per cui faccio questo lavoro.",
  "Non lo dico io, lo dicono gli sposi."
];

function chiaveTestimonianza(t: Testimonianza): string {
  return `${t.cliente}|${t.data}`;
}

// Genera (immagine + didascalia) un post da una recensione reale mai usata
// finora, la aggiunge già "pronta" alla coda (niente LLM, niente Copy: il
// testo di una recensione non va mai riscritto) e segna la recensione come
// usata. Ritorna la recensione scelta, o null se non è possibile (R2 non
// configurato, nessuna recensione in brand.json, upload fallito...).
async function generaPostTestimonianza(queueFile: PostsQueueFile): Promise<Testimonianza | null> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const dashboardPublicUrl = process.env.DASHBOARD_PUBLIC_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !dashboardPublicUrl) return null;

  const brand = await readBrand<BrandFile>();
  const testimonianze = brand.testimonianze ?? [];
  if (testimonianze.length === 0) return null;

  const usateFile = await readData<TestimonianzeUsateFile>("testimonianze-usate.json");
  let disponibili = testimonianze.filter((t) => !usateFile.usate.includes(chiaveTestimonianza(t)));
  if (disponibili.length === 0) {
    // Passate tutte in rotazione: si ricomincia dal principio.
    usateFile.usate = [];
    disponibili = testimonianze;
  }
  const scelta = disponibili[Math.floor(Math.random() * disponibili.length)];

  const immagine = await generaCartTestimonianza(scelta, { nomeArte: brand.nomeArte ?? "il tuo DJ" });
  const url = await caricaBufferSuR2(immagine, {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    dashboardPublicUrl,
    contentType: "image/png",
    estensione: ".png"
  });

  const intro = INTRO_TESTIMONIANZE[Math.floor(Math.random() * INTRO_TESTIMONIANZE.length)];
  const corpo = `${intro}\n\n"${scelta.citazione}"\n— ${scelta.cliente}, ${scelta.tipoEvento}`;
  const cta = testoCtaContatto(brand as Record<string, any>);
  const caption = [corpo, cta].filter((r): r is string => Boolean(r)).join("\n\n");

  // Stesso primo-giorno-libero usato dall'Agente Contenuti (lib/bestTime.ts):
  // un post da recensione non deve rubare/duplicare il giorno già occupato
  // da un altro contenuto "evento" in coda. I post "sito" (agents/sito-agent.ts)
  // sono un canale separato e non contano qui.
  const dateOccupate = new Set(
    queueFile.queue
      .filter((p) => p.formato !== "sito" && ["pronto", "pubblicato", "pubblicato-parziale"].includes(p.status as string) && p.dataProgrammata)
      .map((p) => p.dataProgrammata as string)
  );
  const pianificazione = pianificaProssimaPubblicazione(dateOccupate);

  queueFile.queue.push({
    id: randomUUID(),
    createdAt: nowIso(),
    formato: "post",
    media: {
      source: "testimonianza",
      mediaId: null,
      filename: `testimonianza-${scelta.cliente}-${scelta.data}.png`.replace(/[^a-zA-Z0-9.-]+/g, "-"),
      mimeType: "image/png",
      downloadUrl: url
    },
    caption,
    hashtags: costruisciHashtag(brand as Record<string, any>),
    orarioProgrammato: pianificazione.ora,
    dataProgrammata: pianificazione.data,
    status: "pronto",
    istruzioniUtente: null,
    pillarId: "testimonianze"
  });

  usateFile.usate.push(chiaveTestimonianza(scelta));
  await writeData("testimonianze-usate.json", usateFile);

  return scelta;
}

// Probabilità che, a ogni ciclo, esca un post da una recensione reale invece
// che (o oltre a) una foto/video: le testimonianze sono un pilastro di
// contenuto a sé, escono a rotazione casuale indipendentemente da cosa c'è
// già in coda. Le foto/video vere mandate da Andrea non perdono mai il loro
// posto: aspettano solo un giro in più prima di essere pubblicate.
const PROBABILITA_TESTIMONIANZA = 0.2;

export async function eseguiMediaAgent(): Promise<void> {
  try {
    const libreria = await readData<MediaLibraryFile>("media-library.json");
    const queueFile = await readData<PostsQueueFile>("posts-queue.json");

    // FORCE_TESTIMONIANZA: bypassa la probabilità casuale, solo per test
    // manuali (workflow_dispatch), mai dal ciclo schedulato normale.
    if (process.env.FORCE_TESTIMONIANZA === "true" || Math.random() < PROBABILITA_TESTIMONIANZA) {
      const scelta = await generaPostTestimonianza(queueFile).catch((err) => {
        console.error("[Occhio] Generazione post testimonianza fallita:", err);
        return null;
      });
      if (scelta) {
        await writeData("posts-queue.json", queueFile);
        const riepilogo = `Generato un post dalla recensione di ${scelta.cliente} (${scelta.tipoEvento}), a rotazione con le foto/video.`;
        await logAgentRun({
          agente: IDENTITA.media.nome,
          identita: IDENTITA.media.ruolo,
          status: "ok",
          riepilogo
        });
        await inviaMessaggioTelegram(`✅ ${IDENTITA.media.nome}: ${riepilogo}`);
        return;
      }
    }

    // Mette in coda TUTTI i media non ancora usati in questo stesso giro
    // (non solo il primo): chi carica più foto/video insieme dalla
    // dashboard li vede così avanzare tutti subito verso "Anteprima",
    // invece che uno al giorno (il ritmo di 1 pubblicazione/giorno resta
    // comunque garantito da publishing-agent.ts, che non dipende da
    // quanti contenuti sono "pronto" in coda — sono due limiti separati).
    // Preferisce sempre un video quando disponibile: su Instagram i Reel
    // hanno molta più portata organica dei post statici.
    let messiInCoda = 0;
    for (;;) {
      const nonUsati = libreria.items.filter((m) => m.usatoIl === null);
      const prossimo = nonUsati.find((m) => m.mimeType.startsWith("video/")) ?? nonUsati[0];
      if (!prossimo) break;

      const isVideo = prossimo.mimeType.startsWith("video/");
      queueFile.queue.push({
        id: randomUUID(),
        createdAt: nowIso(),
        formato: isVideo ? "reel" : "post",
        media: {
          source: prossimo.source ?? "dashboard-upload",
          mediaId: prossimo.id,
          filename: prossimo.filename,
          mimeType: prossimo.mimeType,
          downloadUrl: prossimo.url
        },
        caption: null,
        hashtags: [],
        orarioProgrammato: null,
        status: "in-coda-caption",
        istruzioniUtente: prossimo.istruzioniUtente ?? null
      });
      prossimo.usatoIl = nowIso();
      messiInCoda++;
    }

    if (messiInCoda === 0) {
      await logAgentRun({
        agente: IDENTITA.media.nome,
        identita: IDENTITA.media.ruolo,
        status: "nessuna-azione",
        riepilogo: "Nessun nuovo media disponibile: carica nuove foto/video dalla pagina 'Carica media' della dashboard."
      });
      return;
    }

    await writeData("posts-queue.json", queueFile);
    await writeData("media-library.json", libreria);

    const riepilogo = messiInCoda === 1
      ? `Selezionato 1 nuovo media e messo in coda per la didascalia.`
      : `Selezionati ${messiInCoda} nuovi media e messi in coda per la didascalia.`;
    await logAgentRun({
      agente: IDENTITA.media.nome,
      identita: IDENTITA.media.ruolo,
      status: "ok",
      riepilogo
    });
    await inviaMessaggioTelegram(`✅ ${IDENTITA.media.nome}: ${riepilogo}`);
  } catch (err) {
    await logAgentRun({
      agente: IDENTITA.media.nome,
      identita: IDENTITA.media.ruolo,
      status: "errore",
      riepilogo: "Errore imprevisto nell'Agente Media.",
      dettagli: { errore: String(err) }
    });
    await inviaMessaggioTelegram(`⚠️ ${IDENTITA.media.nome}: Errore imprevisto nell'Agente Media.\n${String(err)}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiMediaAgent();
}
