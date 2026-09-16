// Agente "Occhio" — sceglie il prossimo media caricato dalla dashboard
// (pagina "Carica media") e apre una nuova voce in coda (senza ancora
// didascalia: ci pensa l'Agente Contenuti subito dopo, nello stesso run
// del Master). Se non c'è nessun media fresco E la coda è del tutto vuota,
// non lascia l'account fermo: genera un post-cartolina da una recensione
// reale (a rotazione, mai ripetuta finché non sono passate tutte).
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readData, writeData, readBrand, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { IDENTITA } from "./identities.js";
import { scegliOrarioDelGiorno } from "../lib/bestTime.js";
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
  "Le parole più belle sono quelle di chi c'era. Grazie di cuore ❤️",
  "Niente vale più delle parole di chi ha vissuto la serata con noi 🙏",
  "Recensioni così sono il motivo per cui faccio questo lavoro 🎧✨",
  "Non lo dico io, lo dicono gli sposi 💍"
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
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicBaseUrl) return null;

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
    publicBaseUrl,
    contentType: "image/png",
    estensione: ".png"
  });

  const intro = INTRO_TESTIMONIANZE[Math.floor(Math.random() * INTRO_TESTIMONIANZE.length)];
  const corpo = `${intro}\n\n"${scelta.citazione}"\n— ${scelta.cliente}, ${scelta.tipoEvento}`;
  const cta = testoCtaContatto(brand as Record<string, any>);
  const caption = [corpo, cta].filter((r): r is string => Boolean(r)).join("\n\n");
  const oggi = new Date();

  queueFile.queue.push({
    id: randomUUID(),
    createdAt: nowIso(),
    formato: "post",
    media: {
      source: "testimonianza",
      mediaId: null,
      filename: `testimonianza-${chiaveTestimonianza(scelta)}.png`,
      mimeType: "image/png",
      downloadUrl: url
    },
    caption,
    hashtags: costruisciHashtag(brand as Record<string, any>),
    orarioProgrammato: scegliOrarioDelGiorno(oggi.getDay()).ora,
    dataProgrammata: oggi.toISOString().slice(0, 10),
    status: "pronto",
    istruzioniUtente: null,
    pillarId: "testimonianze"
  });

  usateFile.usate.push(chiaveTestimonianza(scelta));
  await writeData("testimonianze-usate.json", usateFile);

  return scelta;
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
      // Nessun media fresco: se la coda è del tutto vuota (niente in attesa,
      // niente già pronto), meglio un post da una recensione reale che
      // lasciare l'account fermo. Se invece c'è già qualcosa in coda, si
      // aspetta tranquillamente il prossimo media senza affollarla.
      const codaVuota = queueFile.queue.every((p) => p.status === "pubblicato" || p.status === "pubblicato-parziale");
      if (codaVuota) {
        const scelta = await generaPostTestimonianza(queueFile).catch((err) => {
          console.error("[Occhio] Generazione post testimonianza fallita:", err);
          return null;
        });
        if (scelta) {
          await writeData("posts-queue.json", queueFile);
          await logAgentRun({
            agente: IDENTITA.media.nome,
            identita: IDENTITA.media.ruolo,
            status: "ok",
            riepilogo: `Nessun media fresco in coda: generato un post dalla recensione di ${scelta.cliente} (${scelta.tipoEvento}) per non lasciare fermo l'account.`
          });
          return;
        }
      }

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
