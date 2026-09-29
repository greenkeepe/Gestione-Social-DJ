// Ponte verso il motore di montaggio "Regia" (cartella regia/): analisi del
// girato (tempi morti, momenti migliori), tagli a tempo di musica, zoom e
// transizioni, look colore, titolo/schermata finale con logo e contatti
// Forte DJ, audio normalizzato a -14 LUFS, conversione corretta dei video HDR
// dell'iPhone. Sostituisce il montaggio "base" dell'Agente Regista; lo si
// puÃ² spegnere con REEL_ENGINE=base (torna al vecchio motore senza toccare
// altro codice).
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PianoReel, ProfiloReel } from "./reelPlanner.js";

export const REGIA_ATTIVA = (process.env.REEL_ENGINE ?? "regia").trim().toLowerCase() !== "base";
export const REGIA_VERSIONE = "regia-3"; // 3: logo iniziale + testi AI in sovrimpressione

// Profilo scelto in dashboard -> stile e modalitÃ  di Regia.
// "auto" = Festa/DJ (scelta di Andrea: stile energico per tutto quello che non Ã¨ indicato diversamente).
// Sempre montaggio musicale, tranne il profilo "talking_head" (persona che parla: taglio pause + sottotitoli).
function stileDaProfilo(profilo: ProfiloReel): { preset: "festa" | "matrimonio" | "evento"; mode: "highlight" | "speech" } {
  switch (profilo) {
    case "wedding": return { preset: "matrimonio", mode: "highlight" };
    case "event":
    case "business":
    case "promotional": return { preset: "evento", mode: "highlight" };
    case "talking_head": return { preset: "evento", mode: "speech" };
    default: return { preset: "festa", mode: "highlight" };
  }
}

export interface RisultatoRegia {
  file: string;
  durataSecondi: number;
  piano: PianoReel;
}

// ---------- Testi in sovrimpressione scritti dall'AI ----------
// L'AI guarda un fotogramma del video (o la foto) e scrive: una frase d'aggancio per i primi
// secondi, 2-3 frasi brevi che accompagnano il video e una frase finale d'invito. Regia li
// disegna bianchi, grandi e in grassetto, con effetti (regia/src/subs.js). Senza AI (chiave
// assente o soglia mensile superata) si usano frasi di riserva nello stesso stile.
// REGIA_TESTI=no (variabile del repository) li disattiva del tutto.
export interface TestiReel {
  hook: string;
  frasi: string[];
  finale: string;
}
type Contenuto = "video" | TipoImmagine;

const importa = (...parti: string[]) => {
  const p = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "regia", "src", ...parti);
  return import(p.startsWith("/") ? p : `file:///${p.replace(/\\/g, "/")}`);
};

const RISERVA: Record<string, TestiReel[]> = {
  festa: [
    { hook: "Qui nessuno resta seduto", frasi: ["Pista piena fino alla fine", "Ogni brano al momento giusto", "Energia dal primo pezzo"], finale: "Scrivimi per la tua festa" },
    { hook: "Quando parte il pezzo giusto", frasi: ["Tutti in pista", "Luci, musica, energia", "La festa che ricorderai"], finale: "Blocca la tua data" },
  ],
  matrimonio: [
    { hook: "Il vostro giorno, la vostra musica", frasi: ["Ogni momento ha il suo brano", "Dalla cerimonia al party", "Emozioni da ballare"], finale: "Scrivimi per la vostra data" },
    { hook: "Un matrimonio da ricordare", frasi: ["Musica scelta con voi", "Pista piena tutta la sera", "Nessun momento vuoto"], finale: "Blocca la tua data" },
  ],
  evento: [
    { hook: "Ogni evento ha la sua musica", frasi: ["Atmosfera su misura", "Audio e luci curati", "Ospiti coinvolti"], finale: "Chiedimi un preventivo" },
  ],
};

const togliEmojiEDate = (s: string) =>
  s
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
    .replace(/#\S+/g, "")
    .replace(/\b(19|20)\d{2}\b/g, "") // niente anni: i reel non devono mai mostrare date
    .replace(/\b\d{1,2}[/.-]\d{1,2}([/.-]\d{2,4})?\b/g, "")
    .replace(/["Â«Â»â€œâ€]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const corta = (s: string, parole: number) => togliEmojiEDate(s).split(" ").slice(0, parole).join(" ").replace(/[,;:.]$/, "");

function sistemaTesti(grezzi: Partial<TestiReel>, quanteFrasi: number, riserva: TestiReel): TestiReel {
  const hook = corta(String(grezzi.hook ?? ""), 7) || riserva.hook;
  const frasi = (Array.isArray(grezzi.frasi) ? grezzi.frasi : []).map((f) => corta(String(f), 6)).filter((f) => f.length > 2).slice(0, quanteFrasi);
  const finale = corta(String(grezzi.finale ?? ""), 7) || riserva.finale;
  return { hook, frasi: frasi.length || !quanteFrasi ? frasi : riserva.frasi.slice(0, quanteFrasi), finale };
}

// Fotogramma (jpg, max 1024px) da un video o da un'immagine, in base64 per l'AI con visione
async function fotogrammaBase64(inputPath: string, isVideo: boolean): Promise<string | null> {
  try {
    const { ffmpeg, probe } = await importa("ffmpeg.js");
    const out = path.join(path.dirname(inputPath), `fotogramma-testi-${Date.now()}.jpg`);
    const pos = isVideo ? ["-ss", String(Math.max(0, ((await probe(inputPath)).duration || 0) * 0.4))] : [];
    await ffmpeg([...pos, "-i", inputPath, "-frames:v", "1", "-vf", "scale='min(1024,iw)':-2", "-q:v", "4", out]);
    const { readFile, rm } = await import("node:fs/promises");
    const b64 = (await readFile(out)).toString("base64");
    await rm(out, { force: true });
    return b64;
  } catch {
    return null;
  }
}

export async function scriviTestiReel(inputPath: string, contenuto: Contenuto, stile: "festa" | "matrimonio" | "evento", log: (m: string) => void = console.log): Promise<TestiReel | null> {
  if ((process.env.REGIA_TESTI ?? "si").trim().toLowerCase() === "no") return null;
  const lista = RISERVA[stile] ?? RISERVA.festa;
  const riserva = lista[Math.floor(Math.random() * lista.length)];
  // card recensione e screenshot del sito hanno giÃ  del testo: solo aggancio + finale
  const quanteFrasi = contenuto === "video" || contenuto === "foto" ? 3 : 0;
  const cosa = {
    video: "un fotogramma di un video girato a un evento dove Forte DJ suonava",
    foto: "una foto di un evento dove Forte DJ suonava",
    testimonianza: "una card con una recensione vera di un cliente di Forte DJ",
    sito: "uno screenshot di una pagina del sito di Forte DJ",
  }[contenuto];
  const prompt = `Sei il social media manager di Forte DJ, DJ per matrimoni, feste ed eventi (Piemonte, Liguria, Lombardia).
L'immagine Ã¨ ${cosa}. Scrivi i testi da mettere in sovrimpressione su un Reel verticale di circa 20-30 secondi, in stile ${stile}.

Regole:
- italiano, frasi brevissime e d'impatto: "hook" al massimo 6 parole, ogni frase al massimo 5 parole, "finale" al massimo 6 parole
- coerenti con quello che si vede (pista, luci, sposi, ospiti, consolle, location...), senza descrivere l'immagine parola per parola
- niente emoji, niente hashtag, niente date, anni o giorni, niente numeri inventati, niente nomi di persone o di luoghi
- tono energico e positivo, in prima persona come il DJ oppure rivolto a chi guarda
- "hook": deve far venire voglia di guardare fino in fondo
- "finale": invito all'azione (es. contattarmi per la propria data o festa)
${quanteFrasi ? `- "frasi": esattamente ${quanteFrasi} frasi diverse tra loro, da mostrare durante il video` : '- "frasi": lista vuota'}

Rispondi SOLO con un JSON valido: {"hook": "...", "frasi": [${quanteFrasi ? '"...", "...", "..."' : ""}], "finale": "..."}`;

  const b64 = await fotogrammaBase64(inputPath, contenuto === "video");
  let grezzi: Partial<TestiReel> = {};
  try {
    const { generaTestoConLLMEImmagine, generaTestoConLLM } = await import("./llm.js");
    const risposta = b64
      ? await generaTestoConLLMEImmagine(prompt, { base64: { mediaType: "image/jpeg", data: b64 } })
      : await generaTestoConLLM(prompt);
    const json = risposta?.replace(/```(?:json)?/gi, "").match(/\{[\s\S]*\}/)?.[0];
    if (json) grezzi = JSON.parse(json) as Partial<TestiReel>;
  } catch (err) {
    log(`[Regia] testi AI non disponibili (${err instanceof Error ? err.message : String(err)}): uso quelli di riserva`);
  }
  const testi = sistemaTesti(grezzi, quanteFrasi, riserva);
  log(`[Regia] Testi: "${testi.hook}" | ${testi.frasi.map((f) => `"${f}"`).join(" | ")} | "${testi.finale}"${grezzi.hook ? "" : " (riserva)"}`);
  return testi;
}

export async function montaConRegia(inputPath: string, profilo: ProfiloReel, log: (m: string) => void = console.log): Promise<RisultatoRegia> {
  const regia = await importa("pipeline.js");
  const { preset, mode } = stileDaProfilo(profilo);
  const testi = await scriviTestiReel(inputPath, "video", preset, log);
  let ultimo = -1;
  const r = await regia.runJob(
    { input: inputPath, preset, mode, formati: ["9x16"], durata: 30, titolo: "", finale: true, musica: "auto", leggero: true, nome: "reel", testi },
    {
      emit: (e: { type: string; msg?: string; pct?: number; stage?: string }) => {
        if (e.type === "log" && e.msg) log(`[Regia] ${e.msg}`);
        if (e.type === "progress" && typeof e.pct === "number" && Math.floor(e.pct / 20) !== ultimo) {
          ultimo = Math.floor(e.pct / 20);
          log(`[Regia] ${e.pct.toFixed(0)}% ${e.stage ?? ""}`);
        }
      }
    }
  );
  const main = r.results.find((x: { formato: string }) => x.formato === "9x16") ?? r.results[0];
  // Piano "compatibile" con quello del vecchio motore: la dashboard mostra
  // categoria Â· stile Â· durata nella pagina "Crea Reel AI".
  const piano: PianoReel = {
    categoria: r.mode === "speech" ? "parlato" : preset,
    stile: "dynamic",
    profiloUsato: profilo,
    durataTarget: 30,
    hook: { inizio: 0, fine: 0 },
    segmenti: [],
    sottotitoli: r.mode === "speech",
    musica: r.mode !== "speech",
    testoHook: null,
    testoChiusura: null
  };
  return { file: main.file, durataSecondi: main.durata, piano };
}

// ---------- Reel da immagini (foto, card testimonianza, screenshot del sito) ----------
export const REGIA_FOTO_VERSIONE = "regia-foto-2"; // 2: logo iniziale + testi AI in sovrimpressione
export type TipoImmagine = "foto" | "testimonianza" | "sito";

export async function creaReelDaImmagine(
  inputPath: string,
  tipo: TipoImmagine,
  log: (m: string) => void = console.log,
  seed?: string // sceglie il brano: stesso seed = stesso brano
): Promise<{ file: string; durataSecondi: number; musica: string }> {
  const regia = await importa("fotoreel.js");
  const cartella = path.join(path.dirname(inputPath), `lavoro-${tipo}`);
  const out = path.join(path.dirname(inputPath), `reel-${tipo}.mp4`);
  const stile = tipo === "testimonianza" ? "matrimonio" : tipo === "sito" ? "evento" : "festa";
  const testi = await scriviTestiReel(inputPath, tipo, stile, log);
  const r = await regia.fotoReel({ file: inputPath, tipo, out, workDir: cartella, seed, testi, log: (m: string) => log(`[Regia] ${m}`) });
  return { file: r.file, durataSecondi: r.durata, musica: r.musica };
}
