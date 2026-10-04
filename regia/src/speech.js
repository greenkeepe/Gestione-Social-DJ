// Parlato (discorsi, brindisi, interviste): trascrizione parola per parola, ripetizioni, montaggio dalle parole tenute.
import { transcribe } from './transcribe.js';
import { framing } from './plan.js';

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').trim();

// Trascrive ogni clip. Tempi delle parole relativi all'inizio della clip.
export async function transcribeClips({ clips, master, root, log, onClip }) {
  const out = [];
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    onClip?.(i);
    if (!c.info.hasVideo) continue;
    let file = c.info.file, offset = 0;
    if (master && c.offset != null) { file = master.info.file; offset = c.offset; }
    else if (!c.an.audio) continue;
    log?.(`Trascrivo ${c.name}...`);
    const words = await transcribe(file, { root, log, start: offset || undefined, dur: offset ? c.info.duration : undefined });
    out.push({
      clipId: c.id, audioFile: file, audioOffset: offset,
      words: words.map((w) => ({ s: +w.start.toFixed(2), e: +Math.max(w.end, w.start + 0.08).toFixed(2), t: w.text, k: true })),
    });
  }
  markRepetitions(out);
  return out;
}

// Frasi = parole separate da una pausa > 0.7s o da punteggiatura finale.
// Una frase molto simile a una delle successive è una "ripetizione" (di solito si tiene l'ultima, quella riuscita).
export function markRepetitions(entries) {
  for (const en of entries) {
    const sent = [];
    let cur = [];
    en.words.forEach((w, i) => {
      const prev = en.words[i - 1];
      if (cur.length && (w.s - prev.e > 0.7 || /[.!?]$/.test(prev.t))) { sent.push(cur); cur = []; }
      cur.push(i);
    });
    if (cur.length) sent.push(cur);
    sent.forEach((idx, si) => idx.forEach((i) => { en.words[i].f = si; en.words[i].r = false; }));
    const tok = sent.map((idx) => idx.map((i) => norm(en.words[i].t)).filter(Boolean));
    for (let a = 0; a < sent.length; a++) {
      for (let b = a + 1; b < Math.min(sent.length, a + 5); b++) {
        const A = tok[a], B = tok[b];
        if (A.length < 3 || B.length < 3) continue;
        const bag = [...B];
        let common = 0;
        for (const t of A) { const j = bag.indexOf(t); if (j >= 0) { common++; bag.splice(j, 1); } }
        // la frase ripetuta di solito è l'inizio (troncato) di quella successiva
        if (common / Math.min(A.length, B.length) >= 0.6) { sent[a].forEach((i) => { en.words[i].r = true; }); break; }
      }
    }
  }
}

// Dalle parole tenute: inquadrature (con audio) + sottotitoli già sincronizzati sul video finale.
export function buildSpeechShots(entries, clipsById, fps) {
  const shots = [], words = [];
  let outT = 0, zi = 0;
  for (const en of entries) {
    const c = clipsById[en.clipId];
    const dur = c.info.duration;
    const segs = [];
    let cur = null;
    for (const w of en.words) {
      if (!w.k) { cur = null; continue; }
      if (cur && w.s - cur.last.e < 0.6) { cur.last = w; cur.ws.push(w); }
      else { cur = { first: w, last: w, ws: [w] }; segs.push(cur); }
    }
    let prevB = 0;
    for (const sg of segs) {
      let a = Math.max(0, sg.first.s - 0.12, prevB);
      const b = Math.min(dur, sg.last.e + 0.2);
      if (b - a < 0.2) continue;
      prevB = b;
      const frames = Math.round((b - a) * fps);
      const parts = Math.max(1, Math.ceil((b - a) / 4.5));
      let f0 = 0;
      for (let p = 0; p < parts; p++) {
        const f1 = Math.round(((p + 1) * frames) / parts);
        const s = a + f0 / fps, d = (f1 - f0) / fps;
        shots.push({
          clipId: en.clipId, srcStart: s, frames: f1 - f0, transOut: null,
          audio: { file: en.audioFile, start: s + en.audioOffset },
          fadeIn: p === 0, fadeOut: p === parts - 1,
          zoom: 'hold', zoomAmt: zi++ % 2 ? 0.14 : 0, ease: 'lineare',
          ...framing(c, s, s + d),
        });
        f0 = f1;
      }
      for (const w of sg.ws) words.push({ text: w.t, start: outT + (w.s - a), end: outT + (w.e - a) });
      outT += frames / fps;
    }
  }
  return { shots, words };
}
