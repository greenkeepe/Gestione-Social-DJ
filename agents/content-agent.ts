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
// Ogni didascalia finisce con un invito a scrivere in DM: l'obiettivo di chi
// guarda non è solo mettere like, ma contattare. Niente link a WhatsApp nel
// testo del post: su Instagram (e Facebook) un URL scritto nella didascalia
// non è mai cliccabile — solo bio, Stories e pulsante di contatto lo sono.
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
    dataProgrammata?: string | null;
    pillarId?: string;
    istruzioniUtente?: string | null;
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
      `Check audio e mille dettagli prima che parta tutto.\n${tagline}`,
      `Un po' di lavoro dietro le quinte prima della festa vera 🎚️`
    ],
    "momenti-forti": [
      `Questo è il momento in cui la pista si accende sul serio.`,
      `Quando la canzone giusta arriva al momento giusto, succede questo 🔥`
    ],
    location: [
      `Ogni location ha la sua atmosfera, qui l'abbiamo tirata fuori bene.`,
      `Location diverse, stesso obiettivo: far ballare tutti.`
    ],
    testimonianze: [
      `Le parole più belle sono quelle di chi c'era, grazie davvero.`,
      `Niente vale le parole di chi ha vissuto la serata con noi.`
    ],
    consigli: [
      `Un consiglio per chi sta organizzando: la musica giusta cambia tutta la serata.`,
      `Una playlist ben fatta non è solo una lista di canzoni, è il ritmo di tutta la serata.`
    ],
    playlist: [
      `Un piccolo assaggio di quello che potrebbe suonare al vostro matrimonio.`,
      `Dal primo ballo al gran finale, ogni momento ha la sua canzone.`
    ],
    "call-to-action": [
      `Le date per il 2027 iniziano a riempirsi: se ci state pensando, scriviamoci.`,
      `Stai organizzando un matrimonio o un evento nel 2027? Meglio parlarne prima che si riempiano le date.`
    ]
  };

  const opzioni = varianti[pilastro.id] ?? [`${nome} — ${pilastro.descrizione}`];
  return opzioni[Math.floor(Math.random() * opzioni.length)].trim();
}

// Pesca N hashtag a caso da un pool senza ripetizioni: usato per non
// pubblicare sempre lo stesso set fisso di hashtag (che l'algoritmo tende a
// penalizzare come "ripetitivo") e per comparire in più ricerche diverse.
function pescaHashtag(pool: string[] | undefined, n: number): string[] {
  if (!pool || pool.length === 0) return [];
  const mescolato = [...pool].sort(() => Math.random() - 0.5);
  return mescolato.slice(0, Math.min(n, mescolato.length));
}

// Mix di hashtag ampi (molta concorrenza, molte ricerche), di nicchia
// (settore DJ/matrimoni, concorrenza minore) e locali (zona servita): più
// efficace per farsi scoprire da chi non segue ancora l'account rispetto a
// ripetere sempre gli stessi 2-3 hashtag identici.
export function costruisciHashtag(brand: Record<string, any>): string[] {
  const pool = brand.toneOfVoice?.hashtagPool;
  if (pool) {
    return [...pescaHashtag(pool.ampi, 5), ...pescaHashtag(pool.nicchia, 4), ...pescaHashtag(pool.locali, 3)];
  }
  return brand.toneOfVoice?.hashtagFissi ?? []; // retrocompatibilità se brand.json non è stato aggiornato
}

// Riga pensata per spingere salvataggi/tag/condivisioni: sono i segnali che
// l'algoritmo di Instagram pesa di più per mostrare un post anche a chi non
// segue ancora l'account (non solo ai follower esistenti come i like).
function testoIncoraggiaSalvataggio(): string {
  const varianti = [
    "Salva questo post, ti torna utile quando organizzi la musica del tuo evento.",
    "Tienilo a portata di mano per quando dovrai pensare alla musica del matrimonio.",
    "Se ti è piaciuto taggami chi si sta per sposare o organizza una festa."
  ];
  return varianti[Math.floor(Math.random() * varianti.length)];
}

// Call to action fissa, generata sempre allo stesso modo (mai dall'LLM, per
// non rischiare che la alteri) e aggiunta in coda a QUALSIASI didascalia.
// Mai un link scritto nel testo: nei post del feed Instagram (e anche
// Facebook) un URL nella didascalia NON è mai cliccabile — solo bio,
// Stories con sticker link o pulsante di contatto del profilo lo sono.
// Il DM è sempre nativo su entrambe le piattaforme, senza setup; il
// pulsante WhatsApp sul profilo è citabile solo dopo averlo attivato
// davvero (config/brand.json > contatti.whatsappBottoneAttivo).
export function testoCtaContatto(brand: Record<string, any>): string | null {
  if (!brand.contatti?.whatsapp && !brand.nomeArte) return null;
  const varianti = [
    "Scrivimi in DM per info e disponibilità.",
    "Mandami un messaggio privato se vuoi sapere di più.",
    "Scrivimi qui in DM, ti rispondo con tutti i dettagli."
  ];
  if (brand.contatti?.whatsappBottoneAttivo) {
    varianti.push(
      "Scrivimi in DM o tocca il bottone WhatsApp sul profilo per info e disponibilità.",
      "Trovi il bottone WhatsApp sul mio profilo: scrivimi per i dettagli."
    );
  }
  return varianti[Math.floor(Math.random() * varianti.length)];
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
    const ctaContatto = testoCtaContatto(brand);
    const notaUtente = target.istruzioniUtente?.trim()
      ? `\nNote di Andrea su questo contenuto specifico (usale SOLO se pertinenti, non inventare fatti/nomi/date che non sono qui): "${target.istruzioniUtente.trim()}".`
      : "";

    let corpo: string | null = null;
    let metodo = "template";

    if (process.env.ANTHROPIC_API_KEY) {
      const immagine = await preparaImmagineDelMedia(target.media);
      if (immagine) {
        const promptVisione = `Guarda l'immagine allegata: è una foto o un fotogramma reale ripreso durante un evento/matrimonio con DJ.
Scrivi una didascalia Instagram in italiano che descriva in modo pertinente quello che vedi davvero (persone, atmosfera, luci, momento della serata), come se la scrivesse di getto Andrea stesso (il DJ), non un copywriter. Tono: ${brand.toneOfVoice?.descrizione ?? "professionale e caloroso"}
Nome d'arte: ${brand.nomeArte ?? ""}. Tema del giorno (spunto, non è obbligatorio nominarlo): ${pilastro.nome} - ${pilastro.descrizione}.${notaUtente}

Scrivi in modo naturale e diretto, come un vero messaggio scritto al volo dal telefono: frasi brevi, linguaggio colloquiale. EVITA lo stile tipico da AI: niente trattini lunghi (—), niente frasi a effetto costruite ("in quell'istante...", "un momento che racconta..."), niente elenchi di aggettivi in fila, niente metafore forzate, niente domande retoriche finali. Massimo 1 emoji, anche zero va benissimo, solo se aggiunge davvero qualcosa.
Massimo 40 parole. NON inventare dettagli che non puoi vedere davvero nell'immagine (nomi degli sposi, date, location specifiche). Non scrivere hashtag, non chiedere di salvare/taggare/condividere e non scrivere una call to action: li aggiungo io dopo.`;
        const testoVisione = await generaTestoConLLMEImmagine(promptVisione, immagine);
        if (testoVisione) {
          corpo = testoVisione;
          metodo = "LLM con visione";
        }
      }

      if (!corpo) {
        const promptTesto = `Scrivi una didascalia Instagram in italiano per un DJ per matrimoni ed eventi, come se la scrivesse di getto Andrea stesso (il DJ), non un copywriter.
Brand: ${JSON.stringify(brand)}
Tema del giorno: ${pilastro.nome} - ${pilastro.descrizione}
Tono: ${brand.toneOfVoice?.descrizione ?? "professionale e caloroso"}.${notaUtente}

Scrivi in modo naturale e diretto, come un vero messaggio scritto al volo dal telefono: frasi brevi, linguaggio colloquiale. EVITA lo stile tipico da AI: niente trattini lunghi (—), niente frasi a effetto costruite, niente elenchi di aggettivi in fila, niente metafore forzate, niente domande retoriche finali. Massimo 1 emoji, anche zero va benissimo.
Massimo 40 parole, NON inventare dettagli falsi (numeri, nomi di sposi) che non sono nel brand. Non usare hashtag, non chiedere di salvare/taggare/condividere e non scrivere una call to action: li aggiungo io dopo.`;
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

    const righe = [corpo.trim(), testoIncoraggiaSalvataggio(), ctaContatto].filter((r): r is string => Boolean(r));
    const caption = righe.join("\n\n");

    target.caption = caption;
    target.hashtags = costruisciHashtag(brand);
    target.pillarId = pilastro.id;
    target.orarioProgrammato = scegliOrarioDelGiorno(new Date().getDay()).ora;
    // Il sistema pubblica sempre in giornata (l'Editore gira più volte al
    // giorno cercando l'orario giusto, mai il giorno dopo): la data è quindi
    // sempre oggi, salvata qui solo per mostrarla nelle anteprime.
    target.dataProgrammata = new Date().toISOString().slice(0, 10);
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
