// Agente "Copy" — scrive didascalia e hashtag per il contenuto in coda,
// seguendo il pilastro editoriale del giorno (data/content-calendar.json)
// e il tone of voice del brand (config/brand.json).
//
// Tre livelli, in ordine (tutti richiedono ANTHROPIC_API_KEY tranne l'ultimo):
//  1) LLM CON VISIONE — Claude guarda davvero la foto (o un fotogramma
//     estratto dal video/reel) e scrive un testo pertinente a quello che è
//     raffigurato, non un template scollegato dal contenuto.
//  2) LLM testuale — se la visione non è disponibile (es. estrazione del
//     fotogramma fallita), un testo comunque naturale ma non "vede" l'immagine.
//  3) Template scritto a mano — zero costo, sempre funzionante, con più
//     varianti per pilastro così due post con lo stesso tema non escono
//     mai identici.
// Ogni didascalia finisce con una call to action verso WhatsApp (numero
// reale da config/brand.json): l'obiettivo di chi guarda non è solo mettere
// like, ma scrivere per informazioni.
import "dotenv/config";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { readData, writeData, readBrand } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { generaTestoConLLM, generaTestoConLLMEImmagine, type ImmagineDaAnalizzare } from "../lib/llm.js";
import { IDENTITA } from "./identities.js";
import { scegliOrarioDelGiorno } from "../lib/bestTime.js";
import {
  verificaFfmpegDisponibile,
  creaCartellaTemporanea,
  rimuoviCartella,
  scaricaFile,
  analizzaVideo,
  estraiFotogramma
} from "../lib/videoTools.js";

interface PostsQueueFile {
  _istruzioni: string;
  queue: Array<{
    id: string;
    formato: string;
    status: string;
    caption: string | null;
    hashtags: string[];
    orarioProgrammato: string | null;
    pillarId?: string;
    media: { downloadUrl: string; mimeType: string; filename: string };
  }>;
}

interface CalendarFile {
  pillars: Array<{ id: string; nome: string; descrizione: string; formatoConsigliato: string[] }>;
  settimanaTipo: Record<string, string>;
}

const GIORNI = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];

function pilastroDelGiorno(calendar: CalendarFile): CalendarFile["pillars"][number] {
  const nomeGiorno = GIORNI[new Date().getDay()];
  const idPreferito = calendar.settimanaTipo[nomeGiorno];
  return calendar.pillars.find((p) => p.id === idPreferito) ?? calendar.pillars[Math.floor(Math.random() * calendar.pillars.length)];
}

// Più varianti per pilastro: senza LLM configurata il template resta comunque
// l'unica fonte di testo, quindi se due contenuti nello stesso giorno/tema
// si susseguono non devono uscire con la didascalia identica.
function templateBase(brand: Record<string, any>, pilastro: CalendarFile["pillars"][number]): string {
  const nome = brand.nomeArte ?? "il tuo DJ";
  const tagline = brand.tagline ?? "";

  const varianti: Record<string, string[]> = {
    "dietro-le-quinte": [
      `Preparazione, check audio, tanta cura nei dettagli prima che inizi la festa 🎧✨\n${tagline}`,
      `Dietro ogni serata perfetta c'è un lavoro fatto di cura e attenzione, anche nei minuti prima che tutto cominci 🎚️`
    ],
    "momenti-forti": [
      `Questo è il momento in cui la pista esplode 🔥 Emozioni così non si dimenticano.`,
      `Quando la musica giusta arriva al momento giusto, succede questo 💃🕺`
    ],
    location: [
      `Ogni location ha la sua atmosfera: qui l'abbiamo trasformata in una vera festa 🎶`,
      `Ambienti diversi, stessa energia: adattare suono e luci a ogni location fa la differenza ✨`
    ],
    testimonianze: [
      `Le parole più belle sono quelle di chi c'era. Grazie di cuore ❤️`,
      `Niente vale più delle parole di chi ha vissuto la serata con noi 🙏`
    ],
    consigli: [
      `Un consiglio per chi sta organizzando il matrimonio: la scelta della musica giusta cambia tutta la serata.`,
      `Una playlist ben costruita non è solo una lista di canzoni: è il ritmo di tutta la vostra serata 🎵`
    ],
    playlist: [
      `Un piccolo assaggio di quello che potrebbe suonare al vostro matrimonio 🎵`,
      `Dal primo ballo al gran finale: ogni momento ha la sua canzone 🎶`
    ],
    "call-to-action": [
      `Le date per il 2027 stanno iniziando a riempirsi: se state pensando al matrimonio dei vostri sogni, scriviamoci! 💍`,
      `Stai organizzando un matrimonio o un evento nel 2027? Le prime date si stanno esaurendo: parliamone 📅`
    ]
  };

  const opzioni = varianti[pilastro.id] ?? [`${nome} — ${pilastro.descrizione}`];
  return opzioni[Math.floor(Math.random() * opzioni.length)].trim();
}

function linkWhatsApp(numero: string | undefined): string | null {
  const cifre = numero?.replace(/[^\d]/g, "") ?? "";
  return cifre ? `https://wa.me/${cifre}` : null;
}

// Call to action fissa verso WhatsApp: generata sempre allo stesso modo
// (mai dall'LLM, per non rischiare che alteri il numero/link) e aggiunta
// in coda a QUALSIASI didascalia, indipendentemente da come è stato scritto
// il corpo del testo.
function testoCtaWhatsapp(brand: Record<string, any>): string | null {
  const link = linkWhatsApp(brand.contatti?.whatsapp);
  if (!link) return null;
  return `📲 Scrivimi su WhatsApp per info e disponibilità: ${link}`;
}

// Prepara "qualcosa da vedere" per l'LLM: per una foto è direttamente il suo
// URL pubblico; per un video/reel è un fotogramma estratto con ffmpeg
// (scaricato temporaneamente, mai salvato altrove). Ritorna null se non è
// possibile (niente ffmpeg, download fallito, ecc.): chi chiama ricade sul
// livello successivo, non blocca mai l'agente.
async function preparaImmagineDelMedia(media: { downloadUrl: string; mimeType: string }): Promise<ImmagineDaAnalizzare | null> {
  if (media.mimeType.startsWith("image/")) {
    return { url: media.downloadUrl };
  }
  if (!media.mimeType.startsWith("video/")) return null;

  let cartella: string | null = null;
  try {
    await verificaFfmpegDisponibile();
    cartella = await creaCartellaTemporanea("content-agent-");
    const videoPath = path.join(cartella, "input.mp4");
    await scaricaFile(media.downloadUrl, videoPath);
    const info = await analizzaVideo(videoPath);
    const framePath = path.join(cartella, "frame.jpg");
    await estraiFotogramma(videoPath, info.durataSecondi * 0.4, framePath);
    const buffer = await readFile(framePath);
    return { base64: { mediaType: "image/jpeg", data: buffer.toString("base64") } };
  } catch (err) {
    console.error("[Copy] impossibile estrarre un fotogramma dal video per la visione:", err);
    return null;
  } finally {
    if (cartella) await rimuoviCartella(cartella);
  }
}

export async function eseguiContentAgent(): Promise<void> {
  try {
    const queueFile = await readData<PostsQueueFile>("posts-queue.json");
    const target = queueFile.queue.find((p) => p.status === "in-coda-caption");

    if (!target) {
      await logAgentRun({
        agente: IDENTITA.content.nome,
        identita: IDENTITA.content.ruolo,
        status: "nessuna-azione",
        riepilogo: "Nessun contenuto in attesa di didascalia oggi."
      });
      return;
    }

    const brand = await readBrand<Record<string, any>>();
    const calendar = await readData<CalendarFile>("content-calendar.json");
    const pilastro = pilastroDelGiorno(calendar);
    const ctaWhatsapp = testoCtaWhatsapp(brand);

    let corpo: string | null = null;
    let metodo = "template";

    if (process.env.ANTHROPIC_API_KEY) {
      const immagine = await preparaImmagineDelMedia(target.media);
      if (immagine) {
        const promptVisione = `Guarda l'immagine allegata: è una foto o un fotogramma reale ripreso durante un evento/matrimonio con DJ.
Scrivi una didascalia Instagram in italiano che descriva in modo pertinente quello che vedi davvero (persone, atmosfera, luci, momento della serata), nel tono di questo brand: ${brand.toneOfVoice?.descrizione ?? "professionale e caloroso"}
Nome d'arte: ${brand.nomeArte ?? ""}. Tema del giorno (spunto, non è obbligatorio nominarlo): ${pilastro.nome} - ${pilastro.descrizione}.
Massimo 55 parole, 2-3 emoji pertinenti se il brand le consente. NON inventare dettagli che non puoi vedere davvero nell'immagine (nomi degli sposi, date, location specifiche). Non scrivere hashtag né una call to action: li aggiungo io dopo.`;
        const testoVisione = await generaTestoConLLMEImmagine(promptVisione, immagine);
        if (testoVisione) {
          corpo = testoVisione;
          metodo = "LLM con visione";
        }
      }

      if (!corpo) {
        const promptTesto = `Scrivi una didascalia Instagram in italiano per un DJ per matrimoni ed eventi.
Brand: ${JSON.stringify(brand)}
Tema del giorno: ${pilastro.nome} - ${pilastro.descrizione}
Tono: ${brand.toneOfVoice?.descrizione ?? "professionale e caloroso"}.
Massimo 55 parole, includi 2-3 emoji pertinenti se il brand le consente, NON inventare dettagli falsi (numeri, nomi di sposi) che non sono nel brand. Non usare hashtag né una call to action nel corpo: li aggiungo io dopo.`;
        const testoLLM = await generaTestoConLLM(promptTesto);
        if (testoLLM) {
          corpo = testoLLM;
          metodo = "LLM testuale";
        }
      }
    }

    if (!corpo) {
      corpo = templateBase(brand, pilastro);
    }

    const caption = ctaWhatsapp ? `${corpo}\n\n${ctaWhatsapp}`.trim() : corpo.trim();
    const hashtagFissi: string[] = brand.toneOfVoice?.hashtagFissi ?? [];

    target.caption = caption;
    target.hashtags = hashtagFissi;
    target.pillarId = pilastro.id;
    target.orarioProgrammato = scegliOrarioDelGiorno(new Date().getDay()).ora;
    target.status = "pronto";

    await writeData("posts-queue.json", queueFile);

    await logAgentRun({
      agente: IDENTITA.content.nome,
      identita: IDENTITA.content.ruolo,
      status: "ok",
      riepilogo: `Scritta didascalia per il contenuto "${pilastro.nome}" (${metodo}). Programmato per le ${target.orarioProgrammato}.`
    });
  } catch (err) {
    await logAgentRun({
      agente: IDENTITA.content.nome,
      identita: IDENTITA.content.ruolo,
      status: "errore",
      riepilogo: "Errore imprevisto nell'Agente Contenuti.",
      dettagli: { errore: String(err) }
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiContentAgent();
}
