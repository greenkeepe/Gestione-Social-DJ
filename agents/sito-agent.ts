// Agente "Vetrina" — ogni giorno cattura uno screenshot reale di una pagina
// del sito (config/brand.json > contatti.sitoWeb) con Playwright, ruotando
// tra tutte le pagine trovate (mai la stessa due giorni di fila finché non
// sono passate tutte, stessa logica delle testimonianze in
// agents/media-agent.ts) e lo mette in coda come post EXTRA — un "canale"
// separato da quello foto/video del giorno: publishing-agent.ts pubblica al
// massimo 1 post "evento" + 1 post "sito" al giorno, mai due sullo stesso
// canale, così le due cose non si rubano il posto a vicenda.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readData, writeData, readBrand, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { inviaMessaggioTelegram } from "../lib/telegram.js";
import { IDENTITA } from "./identities.js";
import { pianificaProssimaPubblicazione } from "../lib/bestTime.js";
import { verificaChromiumDisponibile, scopriPagineSito, catturaScreenshotPagina } from "../lib/sitoScreenshot.js";
import { caricaBufferSuR2 } from "../lib/r2Upload.js";
import { generaTestoConLLMEImmagine } from "../lib/llm.js";
import { testoCtaContatto, costruisciHashtag } from "./content-agent.js";

interface QueueItem {
  id: string;
  createdAt: string;
  status: string;
  formato: string;
  dataProgrammata?: string | null;
  [k: string]: unknown;
}

interface PostsQueueFile {
  _istruzioni: string;
  queue: QueueItem[];
}

interface PagineUsateFile {
  _istruzioni: string;
  usate: string[];
}

interface BrandFile {
  nomeArte?: string;
  toneOfVoice?: Record<string, unknown>;
  contatti?: { sitoWeb?: string; [k: string]: unknown };
}

export async function eseguiSitoAgent(): Promise<void> {
  try {
    const brand = await readBrand<BrandFile>();
    const sitoWeb = brand.contatti?.sitoWeb?.trim();
    if (!sitoWeb || sitoWeb.startsWith("MODIFICA")) {
      await logAgentRun({
        agente: IDENTITA.sito.nome,
        identita: IDENTITA.sito.ruolo,
        status: "nessuna-azione",
        riepilogo: "Nessun sito web configurato in config/brand.json (contatti.sitoWeb): niente vetrina da mostrare."
      });
      return;
    }

    const queueFile = await readData<PostsQueueFile>("posts-queue.json");
    const oggi = nowIso().slice(0, 10);
    const giaOggi = queueFile.queue.some((p) => p.formato === "sito" && p.createdAt.startsWith(oggi));
    if (giaOggi) {
      await logAgentRun({
        agente: IDENTITA.sito.nome,
        identita: IDENTITA.sito.ruolo,
        status: "nessuna-azione",
        riepilogo: "Già generata una vetrina del sito oggi."
      });
      return;
    }

    const r2 = {
      accountId: process.env.R2_ACCOUNT_ID,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucketName: process.env.R2_BUCKET_NAME,
      dashboardPublicUrl: process.env.DASHBOARD_PUBLIC_URL
    };
    if (!r2.accountId || !r2.accessKeyId || !r2.secretAccessKey || !r2.bucketName || !r2.dashboardPublicUrl) {
      throw new Error(
        "Variabili R2 mancanti nell'ambiente dell'agente (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME/DASHBOARD_PUBLIC_URL): impossibile caricare lo screenshot. Vedi .env.example."
      );
    }

    await verificaChromiumDisponibile();

    const pagine = await scopriPagineSito(sitoWeb);
    if (pagine.length === 0) {
      throw new Error(`Nessuna pagina trovata su ${sitoWeb}.`);
    }

    const usateFile = await readData<PagineUsateFile>("sito-pagine-usate.json").catch(() => ({ _istruzioni: "", usate: [] as string[] }));
    let disponibili = pagine.filter((p) => !usateFile.usate.includes(p.url));
    if (disponibili.length === 0) {
      // Passate tutte in rotazione: si ricomincia dal principio.
      usateFile.usate = [];
      disponibili = pagine;
    }
    const scelta = disponibili[Math.floor(Math.random() * disponibili.length)];

    const screenshot = await catturaScreenshotPagina(scelta.url);
    const url = await caricaBufferSuR2(screenshot, {
      accountId: r2.accountId,
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
      bucketName: r2.bucketName,
      dashboardPublicUrl: r2.dashboardPublicUrl,
      contentType: "image/png",
      estensione: ".png"
    });

    let corpo: string | null = null;
    if (process.env.ANTHROPIC_API_KEY) {
      const promptVisione = `Guarda lo screenshot allegato: è una schermata REALE del mio sito web (${sitoWeb}), la pagina/sezione "${scelta.etichetta}".
Scrivi una didascalia Instagram breve e naturale, come se la scrivessi io stesso (${brand.nomeArte ?? "il DJ"}) al volo dal telefono, basata su quello che si vede davvero in questa schermata, che inviti a dare un'occhiata al sito per saperne di più. Tono: ${brand.toneOfVoice?.descrizione ?? "professionale e caloroso"}.
Massimo 2 frasi brevi, dirette, colloquiali. EVITA lo stile da AI: niente trattini lunghi (—), niente frasi a effetto costruite, niente elenchi di aggettivi, niente domande retoriche. Al massimo 1 emoji, meglio zero.
Massimo 22 parole in tutto. NON descrivere elementi che non vedi davvero nello screenshot. Non scrivere hashtag, non scrivere una call to action sui contatti: la aggiungo io dopo.`;
      corpo = await generaTestoConLLMEImmagine(promptVisione, { base64: { mediaType: "image/png", data: screenshot.toString("base64") } });
    }
    if (!corpo) {
      corpo = `Uno sguardo veloce al mio sito: dai un'occhiata a "${scelta.etichetta}", trovi tutto quello che ti serve per farti un'idea.`;
    }

    const cta = testoCtaContatto(brand as Record<string, any>);
    const caption = [corpo.trim(), cta].filter((r): r is string => Boolean(r)).join("\n\n");

    // Stesso "primo giorno libero" usato dall'Agente Contenuti (lib/bestTime.ts),
    // ma su un canale SEPARATO: qui contano solo gli altri post "sito" già in
    // coda, mai quelli foto/video del giorno (altrimenti i due canali si
    // ruberebbero il turno a vicenda invece di uscire lo stesso giorno).
    const dateOccupate = new Set(
      queueFile.queue
        .filter((p) => p.formato === "sito" && ["pronto", "pubblicato", "pubblicato-parziale"].includes(p.status) && p.dataProgrammata)
        .map((p) => p.dataProgrammata as string)
    );
    const pianificazione = pianificaProssimaPubblicazione(dateOccupate);

    queueFile.queue.push({
      id: randomUUID(),
      createdAt: nowIso(),
      formato: "sito",
      media: {
        source: "sito-web",
        mediaId: null,
        filename: `sito-${scelta.etichetta}.png`.replace(/[^a-zA-Z0-9.-]+/g, "-"),
        mimeType: "image/png",
        downloadUrl: url
      },
      caption,
      hashtags: costruisciHashtag(brand as Record<string, any>),
      orarioProgrammato: pianificazione.ora,
      dataProgrammata: pianificazione.data,
      status: "pronto",
      istruzioniUtente: null,
      pillarId: "sito-web"
    });

    usateFile.usate.push(scelta.url);
    await writeData("sito-pagine-usate.json", usateFile);
    await writeData("posts-queue.json", queueFile);

    const riepilogo = `Vetrina del sito pronta ("${scelta.etichetta}"), programmata per il ${pianificazione.data} alle ${pianificazione.ora}.`;
    await logAgentRun({
      agente: IDENTITA.sito.nome,
      identita: IDENTITA.sito.ruolo,
      status: "ok",
      riepilogo
    });
    await inviaMessaggioTelegram(`✅ ${IDENTITA.sito.nome}: ${riepilogo}`);
  } catch (err) {
    await logAgentRun({
      agente: IDENTITA.sito.nome,
      identita: IDENTITA.sito.ruolo,
      status: "errore",
      riepilogo: "Errore imprevisto nell'Agente Vetrina.",
      dettagli: { errore: String(err) }
    });
    await inviaMessaggioTelegram(`⚠️ ${IDENTITA.sito.nome}: Errore imprevisto nell'Agente Vetrina.\n${String(err)}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiSitoAgent();
}
