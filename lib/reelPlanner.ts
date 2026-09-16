// Logica di pianificazione del montaggio: prende le misurazioni reali fatte
// da lib/videoTools.ts (cambi scena, silenzi, volume) e decide QUALI secondi
// del video grezzo diventano il Reel, in che ordine, e con quale stile.
//
// Funzioni tutte pure e sincrone (nessuna chiamata di rete/ffmpeg qui
// dentro): l'agente orchestratore (agents/reel-maker-agent.ts) fa le misure
// async con videoTools e passa i risultati a questo modulo, così la logica
// di scelta resta facile da leggere e testare da sola.
import type { VideoInfo, CambioScena, IntervalloSilenzio, SegmentoCandidato } from "./videoTools.js";

export type ProfiloReel = "auto" | "dj_party" | "wedding" | "event" | "business" | "talking_head" | "promotional";
export type StileMontaggio = "clean" | "dynamic" | "bold";

export interface SegmentoPiano {
  inizio: number;
  fine: number;
  motivo: string;
}

export interface PianoReel {
  categoria: string;
  stile: StileMontaggio;
  profiloUsato: ProfiloReel;
  durataTarget: number;
  hook: { inizio: number; fine: number };
  segmenti: SegmentoPiano[]; // hook incluso, in ordine di montaggio
  sottotitoli: boolean;
  musica: boolean;
  testoHook: string | null;
}

interface CandidatoConPunteggio extends SegmentoCandidato {
  punteggio: number;
  frazioneSilenzio: number;
}

const DURATA_CLIP_MIN = 0.6;
const DURATA_CLIP_IDEALE_MAX = 4.5;

// Trasforma i cambi scena in una lista di spezzoni candidati [inizio,fine),
// scartando quelli troppo brevi e spezzando quelli troppo lunghi (per non
// far dominare il montaggio da un'unica inquadratura statica).
export function generaSegmentiCandidati(durataTotale: number, cambiScena: CambioScena[]): SegmentoCandidato[] {
  const confini = [0, ...cambiScena.map((c) => c.secondo).filter((s) => s > 0.2 && s < durataTotale - 0.2), durataTotale];
  const confiniUnici = [...new Set(confini.map((c) => Math.round(c * 100) / 100))].sort((a, b) => a - b);

  const candidati: SegmentoCandidato[] = [];
  for (let i = 0; i < confiniUnici.length - 1; i++) {
    const inizio = confiniUnici[i];
    const fine = confiniUnici[i + 1];
    const durata = fine - inizio;
    if (durata < DURATA_CLIP_MIN) continue; // troppo corto per essere utile
    if (durata <= DURATA_CLIP_IDEALE_MAX) {
      candidati.push({ inizio, fine });
    } else {
      // spezzone lungo (es. inquadratura fissa): lo dividiamo in porzioni
      // da ~3s così anche una sola scena lunga offre più momenti tra cui scegliere
      let cursore = inizio;
      while (cursore < fine) {
        const fineParziale = Math.min(cursore + 3, fine);
        if (fineParziale - cursore >= DURATA_CLIP_MIN) candidati.push({ inizio: cursore, fine: fineParziale });
        cursore = fineParziale;
      }
    }
  }
  return candidati;
}

function frazioneSovrappostaSilenzio(inizio: number, fine: number, silenzi: IntervalloSilenzio[]): number {
  const durata = fine - inizio;
  if (durata <= 0) return 0;
  let sovrapposto = 0;
  for (const s of silenzi) {
    const overlapStart = Math.max(inizio, s.inizio);
    const overlapEnd = Math.min(fine, s.fine);
    if (overlapEnd > overlapStart) sovrapposto += overlapEnd - overlapStart;
  }
  return Math.min(1, sovrapposto / durata);
}

// Assegna un punteggio "energia/interesse" reale a ogni spezzone candidato,
// combinando volume misurato, silenzio sovrapposto e durata. Punteggio più
// alto = spezzone più adatto a entrare nel Reel.
export function assegnaPunteggi(
  candidati: SegmentoCandidato[],
  volumiMediaDb: number[], // stesso ordine/indice di `candidati`
  silenzi: IntervalloSilenzio[],
  profilo: ProfiloReel
): CandidatoConPunteggio[] {
  return candidati.map((c, i) => {
    const volumeDb = volumiMediaDb[i] ?? -91;
    const frazioneSilenzio = frazioneSovrappostaSilenzio(c.inizio, c.fine, silenzi);
    // il volume in dB è negativo: -91 (silenzio) .. 0 (massimo). Normalizziamo a 0..1.
    const energiaNormalizzata = Math.min(1, Math.max(0, (volumeDb + 60) / 60));
    const durata = c.fine - c.inizio;
    const bonusDurataIdeale = durata >= 1 && durata <= 3.5 ? 0.15 : 0;

    let punteggio = energiaNormalizzata + bonusDurataIdeale;
    // per il profilo talking-head penalizziamo pesantemente il silenzio (jump cut sui vuoti);
    // per gli altri profili un po' di silenzio in mezzo a un'inquadratura bella non è un problema
    const penalitaSilenzio = profilo === "talking_head" ? frazioneSilenzio * 1.2 : frazioneSilenzio * 0.5;
    punteggio -= penalitaSilenzio;

    return { ...c, punteggio, frazioneSilenzio };
  });
}

// In modalità AUTO deduciamo il profilo dall'analisi reale del video invece
// di indovinare: molti cambi scena + energia audio alta e variabile => festa/DJ;
// pochi cambi scena, energia più costante e video più lungo => matrimonio/elegante.
export function scegliProfiloAuto(info: VideoInfo, cambiScena: CambioScena[], volumiMediaDb: number[]): ProfiloReel {
  const cambiPerSecondo = cambiScena.length / Math.max(info.durataSecondi, 1);
  const media = volumiMediaDb.length ? volumiMediaDb.reduce((a, b) => a + b, 0) / volumiMediaDb.length : -91;
  const varianza = volumiMediaDb.length
    ? volumiMediaDb.reduce((acc, v) => acc + (v - media) ** 2, 0) / volumiMediaDb.length
    : 0;

  if (!info.haAudio) return "event";
  if (cambiPerSecondo > 0.15 && media > -30) return "dj_party";
  if (cambiPerSecondo < 0.06 && varianza < 40) return "wedding";
  if (varianza > 80) return "dj_party";
  return "event";
}

const STILE_PER_PROFILO: Record<ProfiloReel, StileMontaggio> = {
  auto: "dynamic",
  dj_party: "bold",
  wedding: "clean",
  event: "dynamic",
  business: "clean",
  talking_head: "dynamic",
  promotional: "bold"
};

const CATEGORIA_PER_PROFILO: Record<ProfiloReel, string> = {
  auto: "evento",
  dj_party: "dj_event",
  wedding: "wedding",
  event: "evento",
  business: "business",
  talking_head: "talking_head",
  promotional: "promozionale"
};

// Durata target del Reel (secondi) e numero massimo di spezzoni per stile:
// i montaggi "bold/dynamic" (festa) preferiscono tagli brevi e frequenti,
// quelli "clean" (matrimonio/elegante) pochi spezzoni più lunghi.
const PARAMETRI_STILE: Record<StileMontaggio, { durataTarget: number; maxSegmenti: number; transizione: "hard-cut" | "crossfade" }> = {
  bold: { durataTarget: 18, maxSegmenti: 8, transizione: "hard-cut" },
  dynamic: { durataTarget: 22, maxSegmenti: 6, transizione: "hard-cut" },
  clean: { durataTarget: 28, maxSegmenti: 5, transizione: "crossfade" }
};

export function parametriStile(stile: StileMontaggio) {
  return PARAMETRI_STILE[stile];
}

export interface OpzioniPiano {
  info: VideoInfo;
  cambiScena: CambioScena[];
  silenzi: IntervalloSilenzio[];
  candidati: SegmentoCandidato[];
  volumiMediaDb: number[]; // stesso ordine di `candidati`
  profiloRichiesto: ProfiloReel;
  testoHook: string | null;
}

// Costruisce il piano di montaggio finale: sceglie l'hook (mai i primissimi
// istanti del video, salvo che non ci sia altro) e i segmenti successivi in
// base al punteggio, poi li rimette in ordine cronologico per mantenere una
// narrazione coerente (hook in apertura, poi il resto come si è svolto).
export function costruisciPiano(opts: OpzioniPiano): PianoReel {
  const profiloEffettivo = opts.profiloRichiesto === "auto"
    ? scegliProfiloAuto(opts.info, opts.cambiScena, opts.volumiMediaDb)
    : opts.profiloRichiesto;

  const stile = STILE_PER_PROFILO[profiloEffettivo];
  const parametri = parametriStile(stile);

  const punteggiati = assegnaPunteggi(opts.candidati, opts.volumiMediaDb, opts.silenzi, profiloEffettivo)
    .filter((c) => c.frazioneSilenzio < 0.9) // scarta spezzoni quasi tutti silenzio
    .sort((a, b) => b.punteggio - a.punteggio);

  if (punteggiati.length === 0) {
    throw new Error("Nessuno spezzone utilizzabile trovato nel video (troppo corto o audio/scena non analizzabili).");
  }

  // hook: il miglior segmento che non parte nel primissimo 8% del video,
  // per non far coincidere sempre il gancio con il primo fotogramma
  const sogliaInizio = opts.info.durataSecondi * 0.08;
  const hook = punteggiati.find((c) => c.inizio >= sogliaInizio) ?? punteggiati[0];

  const scelti = [hook];
  let durataAccumulata = hook.fine - hook.inizio;
  for (const c of punteggiati) {
    if (scelti.length >= parametri.maxSegmenti) break;
    if (durataAccumulata >= parametri.durataTarget) break;
    if (c === hook) continue;
    // evita sovrapposizioni con spezzoni già scelti
    const sovrapposto = scelti.some((s) => c.inizio < s.fine && c.fine > s.inizio);
    if (sovrapposto) continue;
    scelti.push(c);
    durataAccumulata += c.fine - c.inizio;
  }

  // ordine cronologico originale, ma con l'hook sempre in apertura
  const restoInOrdine = scelti.filter((s) => s !== hook).sort((a, b) => a.inizio - b.inizio);
  const segmentiFinali = [hook, ...restoInOrdine];

  return {
    categoria: CATEGORIA_PER_PROFILO[profiloEffettivo],
    stile,
    profiloUsato: profiloEffettivo,
    durataTarget: durataAccumulata,
    hook: { inizio: hook.inizio, fine: hook.fine },
    segmenti: segmentiFinali.map((s, i) => ({
      inizio: s.inizio,
      fine: s.fine,
      motivo: s === hook ? "momento con più energia scelto come apertura del Reel" : `spezzone #${i + 1} selezionato per energia/interesse audio-video`
    })),
    // Nessun ASR/trascrizione gratuita disponibile in questo stack a costo
    // zero: i sottotitoli restano disattivati finché non si collega un
    // servizio di trascrizione (vedi README > AI Reel Maker > Limiti).
    sottotitoli: false,
    // Nessuna libreria musicale con diritti verificati integrata: il Reel
    // usa solo l'audio originale del video (normalizzato), mai una traccia
    // di terzi aggiunta automaticamente.
    musica: false,
    testoHook: opts.testoHook
  };
}

// Testo di apertura di default (usato solo se non c'è una LLM configurata e
// l'utente non ha scritto istruzioni proprie): riusa solo dati reali del
// brand, non inventa mai eventi/nomi/prezzi non forniti.
export function testoHookDefault(nomeArte: string | undefined, categoria: string): string | null {
  const nome = nomeArte?.trim();
  if (!nome || nome.startsWith("MODIFICA")) return null;
  const etichette: Record<string, string> = {
    dj_event: `${nome} 🎧`,
    wedding: `${nome} 💍`,
    talking_head: nome,
    business: nome,
    promozionale: `${nome} 🎉`,
    evento: nome
  };
  return etichette[categoria] ?? nome;
}
