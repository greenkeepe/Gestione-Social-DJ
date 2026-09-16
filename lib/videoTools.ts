// Livello isolato di elaborazione video, usato solo dal Reel Maker Agent
// (agents/reel-maker-agent.ts). Wrapper minimale attorno a ffmpeg/ffprobe:
// niente SDK a pagamento, niente servizi cloud di editing — il rendering
// gira gratis sui runner GitHub Actions (vedi .github/workflows/reel-maker.yml),
// che installano ffmpeg con un semplice "apt-get install".
//
// Ogni funzione qui esegue un comando ffmpeg/ffprobe reale e ne interpreta
// l'output: non ci sono valori finti o "simulati". Se ffmpeg non è
// disponibile, verificaFfmpegDisponibile() lancia un errore chiaro invece
// di far finta che l'elaborazione sia andata a buon fine.
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AwsClient } from "aws4fetch";

const execFileAsync = promisify(execFile);
const MAX_BUFFER = 1024 * 1024 * 80;

export interface VideoInfo {
  durataSecondi: number;
  larghezza: number;
  altezza: number;
  fps: number;
  codec: string;
  haAudio: boolean;
  orientamento: "orizzontale" | "verticale" | "quadrato";
}

export interface CambioScena {
  secondo: number;
}

export interface IntervalloSilenzio {
  inizio: number;
  fine: number;
}

export interface SegmentoCandidato {
  inizio: number;
  fine: number;
}

async function eseguiFfmpeg(args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync("ffmpeg", ["-hide_banner", ...args], { maxBuffer: MAX_BUFFER });
  } catch (err: any) {
    // ffmpeg può uscire con codice diverso da zero anche solo per warning nei
    // filtri di analisi (es. "-f null -"): se abbiamo comunque stdout/stderr
    // utili li restituiamo, altrimenti rilanciamo l'errore originale.
    if (typeof err.stderr === "string") return { stdout: err.stdout ?? "", stderr: err.stderr };
    throw err;
  }
}

async function eseguiFfprobe(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("ffprobe", ["-hide_banner", ...args], { maxBuffer: MAX_BUFFER });
  return stdout;
}

export async function verificaFfmpegDisponibile(): Promise<void> {
  try {
    await execFileAsync("ffmpeg", ["-version"]);
    await execFileAsync("ffprobe", ["-version"]);
  } catch {
    throw new Error(
      "ffmpeg/ffprobe non trovati nel PATH. Sui runner GitHub Actions vengono installati dal workflow reel-maker.yml " +
        "(step 'Installa ffmpeg'); in locale installali con 'apt-get install ffmpeg' (Linux) o 'brew install ffmpeg' (Mac)."
    );
  }
}

export async function creaCartellaTemporanea(prefisso: string): Promise<string> {
  return mkdtemp(path.join(tmpdir(), prefisso));
}

export async function rimuoviCartella(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

export async function scaricaFile(url: string, destinazione: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download del video fallito (${res.status}): ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destinazione, buf);
}

export async function analizzaVideo(filePath: string): Promise<VideoInfo> {
  const videoOutput = await eseguiFfprobe([
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height,r_frame_rate,codec_name,duration",
    "-show_entries", "format=duration",
    "-of", "json",
    filePath
  ]);
  const json = JSON.parse(videoOutput);
  const streamVideo = json.streams?.[0];
  if (!streamVideo) throw new Error("Nessuno stream video trovato nel file caricato: non sembra un video valido.");

  const durata = Number(json.format?.duration ?? streamVideo.duration ?? 0);
  if (!durata || Number.isNaN(durata)) throw new Error("Impossibile determinare la durata del video.");

  const [num, den] = String(streamVideo.r_frame_rate ?? "25/1").split("/").map(Number);
  const fps = den ? num / den : num;

  const audioOutput = await eseguiFfprobe([
    "-v", "error",
    "-select_streams", "a",
    "-show_entries", "stream=index",
    "-of", "json",
    filePath
  ]);
  const haAudio = (JSON.parse(audioOutput).streams ?? []).length > 0;

  const larghezza = Number(streamVideo.width);
  const altezza = Number(streamVideo.height);

  return {
    durataSecondi: durata,
    larghezza,
    altezza,
    fps: fps || 25,
    codec: String(streamVideo.codec_name ?? "sconosciuto"),
    haAudio,
    orientamento: larghezza === altezza ? "quadrato" : larghezza > altezza ? "orizzontale" : "verticale"
  };
}

// Estrae un singolo fotogramma da un video (usato dall'Agente Contenuti per
// dare a Claude qualcosa di reale da "vedere" quando scrive la didascalia di
// un Reel/video, invece di un template scollegato dal contenuto).
export async function estraiFotogramma(inputPath: string, secondo: number, outputPath: string): Promise<void> {
  await eseguiFfmpeg(["-ss", String(Math.max(secondo, 0)), "-i", inputPath, "-frames:v", "1", "-q:v", "3", "-y", outputPath]);
}

// Rileva i cambi di inquadratura reali analizzando il contenuto video
// (filtro "scene" di ffmpeg): usati per non tagliare mai a metà di
// un'inquadratura e per individuare i momenti migliori da usare nel Reel.
export async function rilevaCambiScena(filePath: string, soglia = 0.35): Promise<CambioScena[]> {
  const { stderr } = await eseguiFfmpeg([
    "-i", filePath,
    "-filter:v", `select='gt(scene,${soglia})',showinfo`,
    "-an",
    "-f", "null", "-"
  ]);
  const tempi = [...stderr.matchAll(/pts_time:\s*([0-9.]+)/g)].map((m) => Number(m[1]));
  // dedup + ordina (showinfo può ripetere valori vicinissimi)
  const unici = [...new Set(tempi.map((t) => Math.round(t * 100) / 100))].sort((a, b) => a - b);
  return unici.map((secondo) => ({ secondo }));
}

// Rileva i tratti di silenzio nell'audio (utile soprattutto per il profilo
// "talking head": permette di scartare i vuoti invece di includerli nel Reel).
export async function rilevaSilenzi(filePath: string, sogliaDb = -30, durataMinima = 0.4): Promise<IntervalloSilenzio[]> {
  const { stderr } = await eseguiFfmpeg([
    "-i", filePath,
    "-af", `silencedetect=noise=${sogliaDb}dB:d=${durataMinima}`,
    "-vn",
    "-f", "null", "-"
  ]);
  const inizi = [...stderr.matchAll(/silence_start:\s*([0-9.]+)/g)].map((m) => Number(m[1]));
  const fini = [...stderr.matchAll(/silence_end:\s*([0-9.]+)/g)].map((m) => Number(m[1]));
  const intervalli: IntervalloSilenzio[] = [];
  for (let i = 0; i < Math.min(inizi.length, fini.length); i++) {
    intervalli.push({ inizio: inizi[i], fine: fini[i] });
  }
  return intervalli;
}

// Misura il volume medio/massimo (in dB) di uno spezzone: usato per dare un
// punteggio "energia" reale a ogni segmento candidato, invece di scegliere
// i primi secondi del video a caso.
export async function misuraVolume(filePath: string, inizio: number, durata: number): Promise<{ mediaDb: number; picoDb: number }> {
  const { stderr } = await eseguiFfmpeg([
    "-ss", String(inizio),
    "-t", String(Math.max(durata, 0.1)),
    "-i", filePath,
    "-af", "volumedetect",
    "-vn",
    "-f", "null", "-"
  ]);
  const media = stderr.match(/mean_volume:\s*(-?[0-9.]+)\s*dB/);
  const picco = stderr.match(/max_volume:\s*(-?[0-9.]+)\s*dB/);
  return {
    mediaDb: media ? Number(media[1]) : -91, // -91dB ~ silenzio digitale assoluto
    picoDb: picco ? Number(picco[1]) : -91
  };
}

// Calcola le dimensioni di ritaglio centrato per ottenere un'inquadratura
// 9:16 a partire da un video di qualunque proporzione (crop "intelligente"
// semplice: centrato. Il tracking del soggetto richiederebbe un modello di
// visione artificiale, fuori dai limiti "a costo zero" — vedi README).
export function calcolaRitaglio9x16(info: VideoInfo): { cropW: number; cropH: number } {
  const rapportoTarget = 9 / 16;
  const rapportoSorgente = info.larghezza / info.altezza;
  let cropW: number;
  let cropH: number;
  if (rapportoSorgente > rapportoTarget) {
    // sorgente più larga del target: ritaglio i lati
    cropH = info.altezza;
    cropW = Math.round((info.altezza * rapportoTarget) / 2) * 2;
  } else {
    // sorgente più stretta/alta del target: ritaglio sopra/sotto
    cropW = info.larghezza;
    cropH = Math.round((info.larghezza / rapportoTarget) / 2) * 2;
  }
  return { cropW, cropH };
}

export interface OpzioniClip {
  inputPath: string;
  outputPath: string;
  inizio: number;
  durata: number;
  cropW: number;
  cropH: number;
}

// Ritaglia ed esporta un singolo spezzone già in 1080x1920, pronto per essere
// concatenato. Normalizzare ogni clip (stesso fps/formato pixel) prima del
// montaggio evita errori di concatenazione con ffmpeg.
export async function esportaClip(opts: OpzioniClip): Promise<void> {
  await eseguiFfmpeg([
    "-ss", String(opts.inizio),
    "-t", String(opts.durata),
    "-i", opts.inputPath,
    "-vf", `crop=${opts.cropW}:${opts.cropH},scale=1080:1920,setsar=1,fps=30`,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-ar", "44100",
    "-ac", "2",
    "-y", opts.outputPath
  ]);
}

export interface OpzioniMontaggio {
  clipPaths: string[];
  outputPath: string;
  durateClip: number[]; // durata reale (secondi) di ciascun clip, nello stesso ordine di clipPaths
  transizione: "hard-cut" | "crossfade";
  crossfadeSec?: number;
  testoHook?: string;
}

// Concatena i clip già normalizzati, applica (se richiesto) una dissolvenza
// incrociata video+audio tra uno spezzone e l'altro, normalizza il volume
// finale (loudnorm) e disegna un eventuale testo hook in sovraimpressione.
export async function montaReel(opts: OpzioniMontaggio): Promise<void> {
  const n = opts.clipPaths.length;
  if (n === 0) throw new Error("Nessuno spezzone da montare.");

  const input = opts.clipPaths.flatMap((p) => ["-i", p]);

  let filtri: string[];
  let videoLabel: string;
  let audioLabel: string;

  if (n === 1 || opts.transizione === "hard-cut") {
    const videoInputs = opts.clipPaths.map((_, i) => `[${i}:v]`).join("");
    const audioInputs = opts.clipPaths.map((_, i) => `[${i}:a]`).join("");
    filtri = [`${videoInputs}concat=n=${n}:v=1:a=0[vraw]`, `${audioInputs}concat=n=${n}:v=0:a=1[araw]`];
    videoLabel = "vraw";
    audioLabel = "araw";
  } else {
    const cf = opts.crossfadeSec ?? 0.4;
    filtri = [];
    let videoCorrente = "0:v";
    let audioCorrente = "0:a";
    let durataCumulata = opts.durateClip[0];
    for (let i = 1; i < n; i++) {
      const cfEffettiva = Math.min(cf, opts.durateClip[i - 1] * 0.4, opts.durateClip[i] * 0.4);
      const offset = Math.max(durataCumulata - cfEffettiva, 0.1);
      const vOut = `v${i}`;
      const aOut = `a${i}`;
      filtri.push(`[${videoCorrente}][${i}:v]xfade=transition=fade:duration=${cfEffettiva.toFixed(2)}:offset=${offset.toFixed(2)}[${vOut}]`);
      filtri.push(`[${audioCorrente}][${i}:a]acrossfade=d=${cfEffettiva.toFixed(2)}[${aOut}]`);
      videoCorrente = vOut;
      audioCorrente = aOut;
      durataCumulata = durataCumulata + opts.durateClip[i] - cfEffettiva;
    }
    videoLabel = videoCorrente;
    audioLabel = audioCorrente;
  }

  // normalizzazione audio finale (sempre reale, mai "finta": loudnorm legge
  // davvero il segnale e lo riporta a un livello coerente per Instagram)
  filtri.push(`[${audioLabel}]loudnorm[afinal]`);

  let videoFinaleLabel = videoLabel;
  if (opts.testoHook) {
    const testoEscaped = opts.testoHook.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
    filtri.push(
      `[${videoLabel}]drawtext=text='${testoEscaped}':fontcolor=white:fontsize=58:x=(w-text_w)/2:y=140:box=1:boxcolor=black@0.45:boxborderw=24[vfinal]`
    );
    videoFinaleLabel = "vfinal";
  }

  await eseguiFfmpeg([
    ...input,
    "-filter_complex", filtri.join(";"),
    "-map", `[${videoFinaleLabel}]`,
    "-map", "[afinal]",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-movflags", "+faststart",
    "-y", opts.outputPath
  ]);
}

export interface RisultatoQC {
  ok: boolean;
  motivo?: string;
  durataSecondi?: number;
  larghezza?: number;
  altezza?: number;
}

// Controllo qualità reale sul file finale: verifica che il render abbia
// davvero prodotto un mp4 valido 1080x1920 con video+audio. Se qualcosa non
// torna, il job va in errore invece di essere marcato "pronto" per finta.
export async function controllaQualita(filePath: string, durataAttesaSecondi: number): Promise<RisultatoQC> {
  try {
    const info = await analizzaVideo(filePath);
    if (info.larghezza !== 1080 || info.altezza !== 1920) {
      return { ok: false, motivo: `Risoluzione finale ${info.larghezza}x${info.altezza}, attesa 1080x1920.` };
    }
    if (!info.haAudio) {
      return { ok: false, motivo: "Il file finale non ha una traccia audio." };
    }
    if (Math.abs(info.durataSecondi - durataAttesaSecondi) > Math.max(2, durataAttesaSecondi * 0.25)) {
      return { ok: false, motivo: `Durata finale ${info.durataSecondi.toFixed(1)}s troppo diversa da quella attesa (${durataAttesaSecondi.toFixed(1)}s).` };
    }
    return { ok: true, durataSecondi: info.durataSecondi, larghezza: info.larghezza, altezza: info.altezza };
  } catch (err) {
    return { ok: false, motivo: `Impossibile verificare il file renderizzato: ${String(err)}` };
  }
}

// Carica il Reel finito su Cloudflare R2 (stesso bucket già usato dalla
// dashboard per i media grezzi — vedi dashboard/lib/r2Upload.ts) così il
// risultato ha subito un URL pubblico utilizzabile da Meta Graph API.
// Nessun limite di dimensione pratico (PutObject S3-compatibile) ed
// egress gratuito quando Meta scarica il video per pubblicarlo.
export async function caricaSuR2(
  filePath: string,
  opts: { accountId: string; accessKeyId: string; secretAccessKey: string; bucketName: string; publicBaseUrl: string }
): Promise<string> {
  const buffer = await readFile(filePath);
  const chiaveOggetto = `${randomUUID()}${path.extname(filePath) || ".mp4"}`;

  const client = new AwsClient({ accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey, service: "s3", region: "auto" });
  const endpoint = `https://${opts.accountId}.r2.cloudflarestorage.com/${opts.bucketName}/${chiaveOggetto}`;

  const res = await client.fetch(endpoint, {
    method: "PUT",
    headers: { "content-type": "video/mp4" },
    body: buffer
  });
  if (!res.ok) {
    throw new Error(`Upload del Reel su Cloudflare R2 fallito (${res.status}): ${await res.text().catch(() => "")}`);
  }
  return `${opts.publicBaseUrl.replace(/\/$/, "")}/${chiaveOggetto}`;
}
