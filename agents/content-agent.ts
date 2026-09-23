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
import { inviaMessaggioTelegram } from "../lib/telegram.js";
import { commitEPush } from "../lib/gitCommit.js";
import { generaTestoConLLM, generaTestoConLLMEImmagine, type ImmagineDaAnalizzare } from "../lib/llm.js";
import { IDENTITA } from "./identities.js";
import { pianificaProssimaPubblicazione } from "../lib/bestTime.js";
import { campionaPesato, type VoceLogPerformance } from "../lib/performanceLearning.js";
import {
  verificaFfmpegDisponibile,
  creaCartellaTemporanea,
  rimuoviCartella,
  scaricaDaR2,
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

interface PublishedLogFile {
  log: VoceLogPerformance[];
}

const GIORNI = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];

// Nei giorni con un tema fisso nel calendario editoriale, quello resta
// invariato (è una scelta esplicita di Andrea). Negli altri giorni, invece
// di scegliere a caso, impara dai post già pubblicati quali pilastri hanno
// portato più interazione reale — vedi lib/performanceLearning.ts. Con poco
// storico misurato si comporta comunque come una scelta casuale.
function pilastroDelGiorno(calendar: CalendarFile, log: VoceLogPerformance[]): CalendarFile["pillars"][number] {
  const nomeGiorno = GIORNI[new Date().getDay()];
  const idPreferito = calendar.settimanaTipo[nomeGiorno];
  if (idPreferito) {
    return calendar.pillars.find((p) => p.id === idPreferito) ?? calendar.pillars[Math.floor(Math.random() * calendar.pillars.length)];
  }
  const [scelto] = campionaPesato(calendar.pillars, 1, (p) => p.id, log, (v) => (v.pillarId ? [v.pillarId] : []));
  return scelto ?? calendar.pillars[Math.floor(Math.random() * calendar.pillars.length)];
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

// Mix di hashtag ampi (molta concorrenza, molte ricerche), di nicchia
// (settore DJ/matrimoni, concorrenza minore) e locali (zona servita): più
// efficace per farsi scoprire da chi non segue ancora l'account rispetto a
// ripetere sempre gli stessi 2-3 hashtag identici. Dentro ogni pool, pesca
// pesando per quali hashtag hanno già portato più interazione reale in
// passato (vedi lib/performanceLearning.ts) — con poco storico misurato si
// comporta come una pesca casuale uniforme, esattamente come prima.
export function costruisciHashtag(brand: Record<string, any>, log: VoceLogPerformance[] = []): string[] {
  const pool = brand.toneOfVoice?.hashtagPool;
  if (pool) {
    const chiaviVoceDi = (v: VoceLogPerformance) => v.hashtags ?? [];
    const chiaveHashtag = (h: string) => h;
    return [
      ...campionaPesato<string>(pool.ampi ?? [], 5, chiaveHashtag, log, chiaviVoceDi),
      ...campionaPesato<string>(pool.nicchia ?? [], 4, chiaveHashtag, log, chiaviVoceDi),
      ...campionaPesato<string>(pool.locali ?? [], 3, chiaveHashtag, log, chiaviVoceDi)
    ];
  }
  return brand.toneOfVoice?.hashtagFissi ?? []; // retrocompatibilità se brand.json non è stato aggiornato
}

// Riga pensata per spingere salvataggi/tag/condivisioni/follow: sono i
// segnali che l'algoritmo di Instagram pesa di più per mostrare un post
// anche a chi non segue ancora l'account (non solo ai follower esistenti
// come i like) — un invito esplicito a seguire converte quella visibilità
// in più follower, non solo in più interazioni sul singolo post.
function testoIncoraggiaSalvataggio(): string {
  const varianti = [
    "Salva questo post, ti torna utile quando organizzi la musica del tuo evento.",
    "Tienilo a portata di mano per quando dovrai pensare alla musica del matrimonio.",
    "Se ti è piaciuto taggami chi si sta per sposare o organizza una festa.",
    "Seguimi per altri momenti così: ne pubblico spesso.",
    "Se ti piacciono questi contenuti, seguimi: è il modo più semplice per non perderteli."
  ];
  return varianti[Math.floor(Math.random() * varianti.length)];
}

// Call to action fissa, generata sempre allo stesso modo (mai dall'LLM, per
// non rischiare che la alteri) e aggiunta in coda a QUALSIASI didascalia.
// Mai un link scritto nel testo: nei post del feed Instagram (e anche
// Facebook) un URL nella didascalia NON è mai cliccabile — solo bio,
// Stories con sticker link o pulsante di contatto del profilo lo sono.
// Il DM è sempre nativo su entrambe le piattaforme, senza setup; il
// pulsante WhatsApp sul profilo e il link al sito in bio sono citabili solo
// dopo averli attivati davvero (config/brand.json > contatti.
// whatsappBottoneAttivo / sitoWebBottoneAttivo).
//
// TUTTI e tre i modi di contatto disponibili vengono nominati insieme,
// sempre (non uno a caso tra i tre): il DM è sempre presente, WhatsApp e
// sito si aggiungono quando davvero attivi — mai lasciarne fuori uno per
// caso solo perché la scelta casuale ha pescato un'altra variante.
export function testoCtaContatto(brand: Record<string, any>): string | null {
  if (!brand.contatti?.whatsapp && !brand.nomeArte) return null;

  const variantiDM = [
    "Scrivimi in DM per info e disponibilità.",
    "Mandami un messaggio privato se vuoi sapere di più.",
    "Scrivimi qui in DM, ti rispondo con tutti i dettagli."
  ];
  const pezzi = [variantiDM[Math.floor(Math.random() * variantiDM.length)]];

  if (brand.contatti?.whatsappBottoneAttivo) {
    pezzi.push("Trovi anche il bottone WhatsApp sul mio profilo, se preferisci.");
  }
  if (brand.contatti?.sitoWebBottoneAttivo) {
    pezzi.push("Sul sito in bio trovi foto, recensioni e tutti i dettagli.");
  }
  return pezzi.join(" ");
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

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) return null;

  let cartella: string | null = null;
  try {
    await verificaFfmpegDisponibile();
    cartella = await creaCartellaTemporanea("content-agent-");
    const videoPath = path.join(cartella, "input.mp4");
    // Scarica direttamente da R2 (richiesta firmata), non dall'URL salvato
    // che passa dal proxy della dashboard: per i video più grandi quel
    // passaggio può troncare il download (limite della funzione serverless
    // Vercel), producendo un file corrotto — vedi lib/videoTools.ts >
    // scaricaDaR2 per i dettagli.
    await scaricaDaR2(media.downloadUrl, videoPath, { accountId, accessKeyId, secretAccessKey, bucketName });
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

// Limite di sicurezza per una singola esecuzione (stesso motivo del limite
// gemello in reel-maker-agent.ts): se sono in coda tantissimi contenuti,
// il resto lo prende comunque il prossimo giro, invece di far girare
// un'unica esecuzione all'infinito o generare troppe chiamate LLM in un colpo.
const MASSIMO_DIDASCALIE_PER_ESECUZIONE = 15;

export async function eseguiContentAgent(): Promise<void> {
  let scritte = 0;
  // Un contenuto fallito resta "in-coda-caption" (per poterlo rivedere/
  // ritentare al prossimo giro), quindi senza questo elenco il prossimo
  // .find() di scriviProssimaDidascalia() ripescherebbe SEMPRE lo stesso
  // contenuto già fallito, in un ciclo che non avanza mai.
  const giaFalliti = new Set<string>();
  for (let i = 0; i < MASSIMO_DIDASCALIE_PER_ESECUZIONE; i++) {
    const esito = await scriviProssimaDidascalia(giaFalliti);
    if (esito.stato === "nessuno") break;
    if (esito.stato === "fatto") scritte++;
    else if (esito.stato === "errore" && esito.id) giaFalliti.add(esito.id);
    // "errore": già segnalato dentro scriviProssimaDidascalia, ma non è
    // detto che riguardi anche gli altri contenuti in coda — si continua
    // con il prossimo invece di fermare tutto il giro per un solo errore.
  }

  if (scritte === 0) {
    await logAgentRun({
      agente: IDENTITA.content.nome,
      identita: IDENTITA.content.ruolo,
      status: "nessuna-azione",
      riepilogo: "Nessun contenuto in attesa di didascalia oggi."
    });
  }
}

interface EsitoDidascalia {
  stato: "nessuno" | "fatto" | "errore";
  id?: string;
}

// Scrive la didascalia per UN contenuto in coda (il prossimo trovato con
// status "in-coda-caption", escludendo quelli già falliti in questo stesso
// giro) e salva subito il progresso con un commit+push dedicato (vedi
// lib/gitCommit.ts), così chi carica più foto insieme le vede comparire in
// "Anteprima" una alla volta man mano che sono pronte, non tutte insieme
// solo alla fine del giro.
async function scriviProssimaDidascalia(giaFalliti: Set<string>): Promise<EsitoDidascalia> {
  let target: PostsQueueFile["queue"][number] | undefined;
  try {
    const queueFile = await readData<PostsQueueFile>("posts-queue.json");
    target = queueFile.queue.find((p) => p.status === "in-coda-caption" && !giaFalliti.has(p.id));
    if (!target) return { stato: "nessuno" };

    const brand = await readBrand<Record<string, any>>();
    const calendar = await readData<CalendarFile>("content-calendar.json");
    const publishedLog = await readData<PublishedLogFile>("published-log.json").catch(() => ({ log: [] }));
    const pilastro = pilastroDelGiorno(calendar, publishedLog.log);
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
        // Solo i campi utili a scrivere una didascalia generica: mai le
        // testimonianze (tante, pesano inutilmente sul prompt e su questo
        // percorso non servono, il post non parla di una recensione specifica).
        const brandSintetico = {
          nomeArte: brand.nomeArte,
          tagline: brand.tagline,
          generi: brand.generi,
          tipologieEventi: brand.tipologieEventi,
          puntiDiForza: brand.puntiDiForza,
          areaServita: brand.areaServita
        };
        const promptTesto = `Scrivi una didascalia Instagram in italiano per un DJ per matrimoni ed eventi, come se la scrivesse di getto Andrea stesso (il DJ), non un copywriter.
Brand: ${JSON.stringify(brandSintetico)}
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

    // Un solo contenuto pubblicato al giorno (limite reale imposto da
    // publishing-agent.ts): il primo giorno libero da qui in avanti è
    // quello che NESSUN altro contenuto "pronto"/pubblicato occupa già,
    // così un caricamento massivo di più foto/video si spalma su più
    // giorni diversi in Anteprima invece di finire tutto ammucchiato su oggi.
    const dateOccupate = new Set(
      queueFile.queue
        .filter((p) => p.id !== target!.id && ["pronto", "pubblicato", "pubblicato-parziale"].includes(p.status) && p.dataProgrammata)
        .map((p) => p.dataProgrammata as string)
    );
    const pianificazione = pianificaProssimaPubblicazione(dateOccupate);

    target.caption = caption;
    target.hashtags = costruisciHashtag(brand, publishedLog.log);
    target.pillarId = pilastro.id;
    target.orarioProgrammato = pianificazione.ora;
    target.dataProgrammata = pianificazione.data;
    target.status = "pronto";

    await writeData("posts-queue.json", queueFile);

    const riepilogo = `Scritta didascalia per il contenuto "${pilastro.nome}" (${metodo}). Programmato per il ${target.dataProgrammata} alle ${target.orarioProgrammato}.`;
    await logAgentRun({
      agente: IDENTITA.content.nome,
      identita: IDENTITA.content.ruolo,
      status: "ok",
      riepilogo
    });
    await commitEPush(`chore(copy): ${riepilogo}`);
    await inviaMessaggioTelegram(`✅ ${IDENTITA.content.nome}: ${riepilogo}\n\n"${caption}"`);
    return { stato: "fatto" };
  } catch (err) {
    await logAgentRun({
      agente: IDENTITA.content.nome,
      identita: IDENTITA.content.ruolo,
      status: "errore",
      riepilogo: "Errore imprevisto nell'Agente Contenuti.",
      dettagli: { errore: String(err) }
    });
    await commitEPush("chore(copy): errore nella scrittura di una didascalia").catch(() => {});
    await inviaMessaggioTelegram(`⚠️ ${IDENTITA.content.nome}: Errore imprevisto nell'Agente Contenuti.\n${String(err)}`);
    return { stato: "errore", id: target?.id };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiContentAgent();
}
