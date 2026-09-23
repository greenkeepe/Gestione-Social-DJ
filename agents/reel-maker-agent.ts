// Agente "Regista" (AI Reel Maker) — trasforma UN video grezzo caricato
// dalla pagina dashboard "Crea Reel AI" in un Reel verticale 1080x1920
// pronto per i social: analizza scene/audio con ffmpeg (lib/videoTools.ts),
// decide i momenti migliori (lib/reelPlanner.ts), monta, verifica il
// risultato e lo carica su Cloudflare R2. Elabora un job alla volta, come gli
// altri agenti della coda (media/content/publishing).
//
// Gira su un workflow separato (.github/workflows/reel-maker.yml) invece
// che dentro il ciclo giornaliero del Direttore: il rendering video è
// potenzialmente lungo, quindi ha una sua schedulazione dedicata (come già
// avviene per l'Agente Pubblicazione in publish-check.yml).
//
// Il Reel finito NON viene pubblicato automaticamente: entra nella libreria
// media (data/media-library.json) solo quando l'utente preme "Usa per un
// post" dalla dashboard. Da quel momento lo gestiscono gli agenti già
// esistenti (Occhio -> Copy -> Editore), senza nessuna duplicazione.
import "dotenv/config";
import path from "node:path";
import { readData, writeData, readBrand, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { IDENTITA } from "./identities.js";
import { generaTestoConLLM } from "../lib/llm.js";
import { inviaMessaggioTelegram } from "../lib/telegram.js";
import {
  verificaFfmpegDisponibile,
  creaCartellaTemporanea,
  rimuoviCartella,
  scaricaFile,
  analizzaVideo,
  rilevaCambiScena,
  rilevaSilenzi,
  misuraVolume,
  calcolaRitaglio9x16,
  esportaClip,
  montaReel,
  controllaQualita,
  caricaSuR2
} from "../lib/videoTools.js";
import { generaSegmentiCandidati, costruisciPiano, testoHookDefault, testoChiusuraDefault, rimuoviEmoji, parametriStile, type ProfiloReel, type PianoReel } from "../lib/reelPlanner.js";

interface ReelJob {
  id: string;
  createdAt: string;
  videoUrl: string;
  filename: string;
  mimeType: string;
  profilo: ProfiloReel;
  istruzioni: string | null;
  status: "in-coda-analisi" | "pronto" | "errore" | "usato";
  step: string;
  aggiornatoIl: string;
  erroreMessaggio: string | null;
  risultato: { reelUrl: string; durataSecondi: number; piano: PianoReel } | null;
  source?: "dashboard" | "telegram";
}

interface ReelJobsFile {
  _istruzioni: string;
  jobs: ReelJob[];
}

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

const ENV_ABILITATO = process.env.ENABLE_AI_REEL_MAKER;
const ABILITATO = ENV_ABILITATO === undefined || ENV_ABILITATO.trim().toLowerCase() !== "false";

function estensioneDaMime(mimeType: string): string {
  if (mimeType.includes("quicktime")) return ".mov";
  if (mimeType.includes("webm")) return ".webm";
  if (mimeType.includes("matroska")) return ".mkv";
  return ".mp4";
}

async function elaboraJob(job: ReelJob): Promise<void> {
  const r2 = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    dashboardPublicUrl: process.env.DASHBOARD_PUBLIC_URL
  };
  if (!r2.accountId || !r2.accessKeyId || !r2.secretAccessKey || !r2.bucketName || !r2.dashboardPublicUrl) {
    throw new Error(
      "Variabili R2 mancanti nell'ambiente dell'agente (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME/DASHBOARD_PUBLIC_URL): impossibile caricare il Reel renderizzato. Vedi .env.example."
    );
  }

  const cartella = await creaCartellaTemporanea("reel-maker-");
  try {
    job.step = "analisi";
    const inputPath = path.join(cartella, `input${estensioneDaMime(job.mimeType)}`);
    await scaricaFile(job.videoUrl, inputPath);

    const info = await analizzaVideo(inputPath);
    if (info.durataSecondi < 3) {
      throw new Error(`Video troppo corto (${info.durataSecondi.toFixed(1)}s): serve almeno qualche secondo di materiale per montare un Reel.`);
    }

    const [cambiScena, silenzi] = await Promise.all([
      rilevaCambiScena(inputPath),
      info.haAudio ? rilevaSilenzi(inputPath) : Promise.resolve([])
    ]);

    const candidati = generaSegmentiCandidati(info.durataSecondi, cambiScena);
    if (candidati.length === 0) {
      throw new Error("Non sono stati trovati spezzoni utilizzabili (video troppo statico o troppo corto per essere tagliato).");
    }

    const volumiMediaDb: number[] = [];
    for (const c of candidati) {
      if (!info.haAudio) {
        volumiMediaDb.push(-91);
        continue;
      }
      const { mediaDb } = await misuraVolume(inputPath, c.inizio, c.fine - c.inizio);
      volumiMediaDb.push(mediaDb);
    }

    job.step = "piano";
    const brand = await readBrand<Record<string, any>>().catch(() => ({} as Record<string, any>));

    let piano = costruisciPiano({
      info,
      cambiScena,
      silenzi,
      candidati,
      volumiMediaDb,
      profiloRichiesto: job.profilo,
      testoHook: null,
      testoChiusura: null
    });

    let testoHook = testoHookDefault(brand.nomeArte, piano.categoria);
    if (job.istruzioni?.trim() && process.env.ANTHROPIC_API_KEY) {
      const promptTesto = `Scrivi un brevissimo testo (massimo 5 parole, in italiano, niente punteggiatura finale, NESSUNA emoji: il font del video non le supporta) da sovraimprimere come apertura di un Reel Instagram verticale per un DJ per matrimoni/eventi.
Categoria del Reel: ${piano.categoria}. Nome d'arte: ${brand.nomeArte ?? ""}.
Note dell'utente su questo video specifico (usale SOLO se pertinenti, non inventare fatti/nomi/date non presenti qui): "${job.istruzioni}".
Rispondi SOLO col testo da mostrare, senza virgolette né spiegazioni.`;
      const generato = await generaTestoConLLM(promptTesto);
      if (generato) testoHook = rimuoviEmoji(generato.replace(/["\n]/g, "")).slice(0, 40) || testoHook;
    }
    piano = { ...piano, testoHook, testoChiusura: testoChiusuraDefault() };

    job.step = "montaggio";
    const { cropW, cropH } = calcolaRitaglio9x16(info);
    const parametri = parametriStile(piano.stile);
    const clipPaths: string[] = [];
    const durateClip: number[] = [];
    for (let i = 0; i < piano.segmenti.length; i++) {
      const s = piano.segmenti[i];
      const outputClip = path.join(cartella, `clip-${i}.mp4`);
      // Zoom lento alternato (dentro/fuori) tra uno spezzone e l'altro: dà
      // varietà invece di far "respirare" ogni clip sempre allo stesso modo.
      const zoom = { direzione: (i % 2 === 0 ? "in" : "out") as "in" | "out", intensita: parametri.intensitaZoom };
      await esportaClip({ inputPath, outputPath: outputClip, inizio: s.inizio, durata: s.fine - s.inizio, cropW, cropH, zoom });
      clipPaths.push(outputClip);
      durateClip.push(s.fine - s.inizio);
    }

    const outputFinale = path.join(cartella, "reel-finale.mp4");
    await montaReel({
      clipPaths,
      outputPath: outputFinale,
      durateClip,
      transizione: parametri.transizione,
      crossfadeSec: parametri.crossfadeSec,
      paletteTransizioni: parametri.paletteTransizioni,
      testoHook: piano.testoHook ?? undefined,
      testoChiusura: piano.testoChiusura ?? undefined
    });

    job.step = "verifica-qualita";
    const durataAttesa = durateClip.reduce((a, b) => a + b, 0);
    const qc = await controllaQualita(outputFinale, durataAttesa);
    if (!qc.ok) {
      throw new Error(`Controllo qualità del render fallito: ${qc.motivo}`);
    }

    job.step = "caricamento";
    const reelUrl = await caricaSuR2(outputFinale, {
      accountId: r2.accountId,
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
      bucketName: r2.bucketName,
      dashboardPublicUrl: r2.dashboardPublicUrl
    });

    job.status = "pronto";
    job.step = "completato";
    job.erroreMessaggio = null;
    job.risultato = { reelUrl, durataSecondi: qc.durataSecondi ?? durataAttesa, piano };
  } finally {
    await rimuoviCartella(cartella);
  }
}

export async function eseguiReelMakerAgent(): Promise<void> {
  if (!ABILITATO) {
    await logAgentRun({
      agente: IDENTITA.reelMaker.nome,
      identita: IDENTITA.reelMaker.ruolo,
      status: "nessuna-azione",
      riepilogo: "AI Reel Maker disattivato (ENABLE_AI_REEL_MAKER=false)."
    });
    return;
  }

  try {
    await verificaFfmpegDisponibile();
  } catch (err) {
    await logAgentRun({
      agente: IDENTITA.reelMaker.nome,
      identita: IDENTITA.reelMaker.ruolo,
      status: "errore",
      riepilogo: "ffmpeg non è disponibile in questo ambiente: impossibile elaborare Reel.",
      dettagli: { errore: String(err) }
    });
    return;
  }

  const jobsFile = await readData<ReelJobsFile>("reel-jobs.json");
  const job = jobsFile.jobs.find((j) => j.status === "in-coda-analisi");

  if (!job) {
    await logAgentRun({
      agente: IDENTITA.reelMaker.nome,
      identita: IDENTITA.reelMaker.ruolo,
      status: "nessuna-azione",
      riepilogo: "Nessun video grezzo in coda per l'AI Reel Maker."
    });
    return;
  }

  try {
    await elaboraJob(job);
    job.aggiornatoIl = nowIso();

    // I video ricevuti via Telegram non hanno un passaggio di revisione in
    // dashboard: appena il Reel è pronto entra direttamente nella libreria
    // media (esattamente come premere "Usa per un post"), così la pipeline
    // Occhio -> Copy -> Editore lo prende in carico da sola. I job creati
    // dalla pagina "Crea Reel AI" restano invece in stato "pronto" in attesa
    // di conferma manuale, comportamento invariato.
    let promossoAutomaticamente = false;
    if (job.source === "telegram" && job.risultato) {
      const libreria = await readData<MediaLibraryFile>("media-library.json");
      libreria.items.push({
        id: job.id,
        url: job.risultato.reelUrl,
        filename: `reel-${job.filename.replace(/\.[^.]+$/, "")}.mp4`,
        mimeType: "video/mp4",
        uploadedAt: nowIso(),
        usatoIl: null,
        source: "telegram",
        istruzioniUtente: job.istruzioni
      });
      await writeData("media-library.json", libreria);
      job.status = "usato";
      promossoAutomaticamente = true;
    }

    await writeData("reel-jobs.json", jobsFile);

    await logAgentRun({
      agente: IDENTITA.reelMaker.nome,
      identita: IDENTITA.reelMaker.ruolo,
      status: "ok",
      riepilogo: promossoAutomaticamente
        ? `Reel creato da "${job.filename}" (categoria ${job.risultato?.piano.categoria}, stile ${job.risultato?.piano.stile}, ${job.risultato?.durataSecondi.toFixed(0)}s) e messo in coda per la pubblicazione automatica (ricevuto via Telegram).`
        : `Reel creato da "${job.filename}" (categoria ${job.risultato?.piano.categoria}, stile ${job.risultato?.piano.stile}, ${job.risultato?.durataSecondi.toFixed(0)}s). Pronto in "Crea Reel AI" per essere usato in un post.`
    });

    if (promossoAutomaticamente) {
      await inviaMessaggioTelegram("🎬 Il tuo Reel è pronto! Lo pubblico automaticamente al momento migliore, te lo faccio sapere.");
    }
  } catch (err) {
    job.status = "errore";
    job.erroreMessaggio = err instanceof Error ? err.message : String(err);
    job.aggiornatoIl = nowIso();
    await writeData("reel-jobs.json", jobsFile);

    await logAgentRun({
      agente: IDENTITA.reelMaker.nome,
      identita: IDENTITA.reelMaker.ruolo,
      status: "errore",
      riepilogo: `Errore nella creazione del Reel da "${job.filename}" (fermato allo step "${job.step}"): ${job.erroreMessaggio}`,
      dettagli: { errore: String(err) }
    });

    if (job.source === "telegram") {
      await inviaMessaggioTelegram(`⚠️ Non sono riuscito a montare il video che mi hai mandato: ${job.erroreMessaggio}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiReelMakerAgent();
}
