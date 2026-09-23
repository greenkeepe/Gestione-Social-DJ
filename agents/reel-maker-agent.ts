// Agente "Regista" (AI Reel Maker) — trasforma i video grezzi caricati
// dalla pagina dashboard "Crea Reel AI" (o mandati su Telegram) in Reel
// verticali 1080x1920 pronti per i social: analizza scene/audio con ffmpeg
// (lib/videoTools.ts), decide i momenti migliori (lib/reelPlanner.ts),
// monta, verifica il risultato e lo carica su Cloudflare R2.
//
// Gira su un workflow separato (.github/workflows/reel-maker.yml) invece
// che dentro il ciclo giornaliero del Direttore: il rendering video è
// potenzialmente lungo, quindi ha una sua schedulazione dedicata (come già
// avviene per l'Agente Pubblicazione in publish-check.yml).
//
// Ogni Reel pronto entra subito nella libreria media (data/media-library.json),
// qualunque sia la sua origine: da lì lo gestiscono gli agenti già esistenti
// (Occhio -> Copy -> Editore) esattamente come qualsiasi altro media, senza
// nessuna duplicazione e senza passaggi di conferma manuale da aspettare.
import "dotenv/config";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { readData, writeData, readBrand, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { IDENTITA } from "./identities.js";
import { generaTestoConLLM, generaTestoConLLMEImmagine } from "../lib/llm.js";
import { inviaMessaggioTelegram } from "../lib/telegram.js";
import { commitEPush, innescaWorkflow } from "../lib/gitCommit.js";
import {
  verificaFfmpegDisponibile,
  creaCartellaTemporanea,
  rimuoviCartella,
  scaricaDaR2,
  analizzaVideo,
  rilevaCambiScena,
  rilevaSilenzi,
  misuraVolume,
  calcolaRitaglio9x16,
  esportaClip,
  estraiFotogramma,
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
    await scaricaDaR2(job.videoUrl, inputPath, {
      accountId: r2.accountId,
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
      bucketName: r2.bucketName
    });

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
    let testoChiusura = testoChiusuraDefault();
    if (process.env.ANTHROPIC_API_KEY) {
      // Un fotogramma reale preso dal momento scelto come apertura (hook):
      // dà a Claude qualcosa di vero da "vedere" invece di indovinare il
      // contenuto del video dal solo nome del file o dalle note utente.
      const framePath = path.join(cartella, "frame-hook.jpg");
      let immagine: { base64: { mediaType: string; data: string } } | null = null;
      try {
        await estraiFotogramma(inputPath, (piano.hook.inizio + piano.hook.fine) / 2, framePath);
        const buffer = await readFile(framePath);
        immagine = { base64: { mediaType: "image/jpeg", data: buffer.toString("base64") } };
      } catch (err) {
        console.error("[Regista] impossibile estrarre il fotogramma per la visione:", err);
      }

      const noteUtente = job.istruzioni?.trim()
        ? `\nNote di Andrea su questo video specifico (usale SOLO se pertinenti, non inventare fatti/nomi/date non presenti qui): "${job.istruzioni}".`
        : "";
      const promptComune = `Categoria del Reel: ${piano.categoria}. Nome d'arte del DJ: ${brand.nomeArte ?? ""}.${noteUtente}
Regole: italiano, NESSUNA emoji (il font del video non le supporta), niente punteggiatura finale, niente virgolette. Rispondi SOLO col testo da mostrare, senza spiegazioni.`;

      const promptHook = immagine
        ? `Guarda il fotogramma allegato: è un momento reale ripreso durante l'apertura di questo Reel.
Scrivi un testo breve ma d'impatto (tra le 4 e le 10 parole, anche su più righe) da sovraimprimere come apertura del Reel, pertinente a quello che vedi davvero nell'immagine (persone, atmosfera, luci, momento della serata) — non un template generico.
${promptComune}`
        : `Scrivi un testo breve ma d'impatto (tra le 4 e le 8 parole) da sovraimprimere come apertura di un Reel Instagram verticale per un DJ per matrimoni/eventi.
${promptComune}`;
      const generatoHook = immagine ? await generaTestoConLLMEImmagine(promptHook, immagine) : await generaTestoConLLM(promptHook);
      if (generatoHook) testoHook = rimuoviEmoji(generatoHook.replace(/["\n]/g, " ").trim()).slice(0, 90) || testoHook;

      const promptChiusura = `Scrivi una breve call to action di chiusura (tra le 4 e le 9 parole) da sovraimprimere negli ultimi secondi di questo Reel, che inviti a scrivere in DM per informazioni/disponibilità (deve essere chiaro che si scrive in direct/messaggio privato).
${promptComune}`;
      const generatoChiusura = await generaTestoConLLM(promptChiusura);
      if (generatoChiusura) testoChiusura = rimuoviEmoji(generatoChiusura.replace(/["\n]/g, " ").trim()).slice(0, 70) || testoChiusura;
    }
    piano = { ...piano, testoHook, testoChiusura };

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

// Limite di sicurezza per una singola esecuzione: se qualcuno carica
// tantissimi video insieme, il resto lo prende comunque la prossima
// esecuzione (il prossimo upload la innesca subito, altrimenti il giro
// ogni ~20 minuti) invece di far girare un'unica esecuzione all'infinito.
const MASSIMO_JOB_PER_ESECUZIONE = 15;

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

  // Elabora TUTTI i video in coda in questa stessa esecuzione, uno alla
  // volta, invece di uno solo per esecuzione: con tanti video caricati
  // insieme, GitHub annulla in automatico le esecuzioni rimaste "in coda"
  // (non ancora partite) quando ne arriva una più recente per lo stesso
  // workflow — un video alla volta per esecuzione lasciava quindi gran
  // parte della coda ferma per ore, in attesa del prossimo giro
  // programmato. Rilegge reel-jobs.json a ogni giro (non una sola volta
  // all'inizio) e salva subito il risultato di ognuno con un commit+push
  // dedicato (vedi lib/gitCommit.ts): la coda in dashboard mostra così i
  // video via via completati mentre l'esecuzione è ancora in corso, non
  // tutti insieme solo alla fine.
  let elaborati = 0;
  while (elaborati < MASSIMO_JOB_PER_ESECUZIONE) {
    const jobsFile = await readData<ReelJobsFile>("reel-jobs.json");
    const job = jobsFile.jobs.find((j) => j.status === "in-coda-analisi");
    if (!job) break;

    try {
      await elaboraJob(job);
      job.aggiornatoIl = nowIso();

      // Qualunque sia l'origine (dashboard o Telegram), il Reel pronto entra
      // subito nella libreria media, così la pipeline Occhio -> Copy ->
      // Editore lo prende in carico da sola: didascalia scritta dall'AI e
      // pubblicazione nell'orario migliore, stessa logica di ogni altro
      // media. Nessun passaggio manuale "Usa per un post" da aspettare.
      let promosso = false;
      if (job.risultato) {
        const libreria = await readData<MediaLibraryFile>("media-library.json");
        libreria.items.push({
          id: job.id,
          url: job.risultato.reelUrl,
          filename: `reel-${job.filename.replace(/\.[^.]+$/, "")}.mp4`,
          mimeType: "video/mp4",
          uploadedAt: nowIso(),
          usatoIl: null,
          source: job.source ?? "dashboard",
          istruzioniUtente: job.istruzioni
        });
        await writeData("media-library.json", libreria);
        job.status = "usato";
        promosso = true;
      }

      await writeData("reel-jobs.json", jobsFile);

      await logAgentRun({
        agente: IDENTITA.reelMaker.nome,
        identita: IDENTITA.reelMaker.ruolo,
        status: "ok",
        riepilogo: promosso
          ? `Reel creato da "${job.filename}" (categoria ${job.risultato?.piano.categoria}, stile ${job.risultato?.piano.stile}, ${job.risultato?.durataSecondi.toFixed(0)}s) e messo in coda per la didascalia e la pubblicazione automatica.`
          : `Reel creato da "${job.filename}" (categoria ${job.risultato?.piano.categoria}, stile ${job.risultato?.piano.stile}, ${job.risultato?.durataSecondi.toFixed(0)}s).`
      });

      await commitEPush(`chore(regista): Reel creato da "${job.filename}"`);

      if (promosso) {
        // Innescato subito da qui (non solo alla fine dell'intera coda): il
        // Reel riceve così la didascalia senza aspettare il resto dei video
        // ancora in lavorazione in questa stessa esecuzione.
        try {
          await innescaWorkflow("daily-agents.yml");
        } catch {
          /* non bloccante: il ciclo giornaliero lo prenderà comunque più tardi */
        }
        await inviaMessaggioTelegram(`🎬 Reel pronto da "${job.filename}"! Lo pubblico automaticamente al momento migliore, te lo faccio sapere.`);
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

      await commitEPush(`chore(regista): errore nel Reel da "${job.filename}"`);

      await inviaMessaggioTelegram(`⚠️ Non sono riuscito a montare "${job.filename}": ${job.erroreMessaggio}`);
    }

    elaborati++;
  }

  if (elaborati === 0) {
    await logAgentRun({
      agente: IDENTITA.reelMaker.nome,
      identita: IDENTITA.reelMaker.ruolo,
      status: "nessuna-azione",
      riepilogo: "Nessun video grezzo in coda per l'AI Reel Maker."
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiReelMakerAgent();
}
