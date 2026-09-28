// Ponte verso il motore di montaggio "Regia" (cartella regia/): analisi del
// girato (tempi morti, momenti migliori), tagli a tempo di musica, zoom e
// transizioni, look colore, titolo/schermata finale con logo e contatti
// Forte DJ, audio normalizzato a -14 LUFS, conversione corretta dei video HDR
// dell'iPhone. Sostituisce il montaggio "base" dell'Agente Regista; lo si
// può spegnere con REEL_ENGINE=base (torna al vecchio motore senza toccare
// altro codice).
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PianoReel, ProfiloReel } from "./reelPlanner.js";

export const REGIA_ATTIVA = (process.env.REEL_ENGINE ?? "regia").trim().toLowerCase() !== "base";
export const REGIA_VERSIONE = "regia-2";

// Profilo scelto in dashboard -> stile e modalità di Regia.
// "auto" = Festa/DJ (scelta di Andrea: stile energico per tutto quello che non è indicato diversamente).
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

export async function montaConRegia(inputPath: string, profilo: ProfiloReel, log: (m: string) => void = console.log): Promise<RisultatoRegia> {
  const cartellaRegia = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "regia", "src", "pipeline.js");
  const regia = await import(cartellaRegia.startsWith("/") ? cartellaRegia : `file:///${cartellaRegia.replace(/\\/g, "/")}`);
  const { preset, mode } = stileDaProfilo(profilo);
  let ultimo = -1;
  const r = await regia.runJob(
    { input: inputPath, preset, mode, formati: ["9x16"], durata: 30, titolo: "", finale: true, musica: "auto", leggero: true, nome: "reel" },
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
  // categoria · stile · durata nella pagina "Crea Reel AI".
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
export const REGIA_FOTO_VERSIONE = "regia-foto-1";
export type TipoImmagine = "foto" | "testimonianza" | "sito";

export async function creaReelDaImmagine(
  inputPath: string,
  tipo: TipoImmagine,
  log: (m: string) => void = console.log
): Promise<{ file: string; durataSecondi: number; musica: string }> {
  const modulo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "regia", "src", "fotoreel.js");
  const regia = await import(modulo.startsWith("/") ? modulo : `file:///${modulo.replace(/\\/g, "/")}`);
  const cartella = path.join(path.dirname(inputPath), `lavoro-${tipo}`);
  const out = path.join(path.dirname(inputPath), `reel-${tipo}.mp4`);
  const r = await regia.fotoReel({ file: inputPath, tipo, out, workDir: cartella, log: (m: string) => log(`[Regia] ${m}`) });
  return { file: r.file, durataSecondi: r.durata, musica: r.musica };
}
