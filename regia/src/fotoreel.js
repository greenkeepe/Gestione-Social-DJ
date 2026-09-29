// REEL DA IMMAGINI: da una foto, una card testimonianza o uno screenshot del sito crea un Reel 9:16
// con musica (libera da diritti), tagli sul beat, zoom/panoramiche, transizioni, look e schermata finale Forte DJ.
import fs from 'node:fs';
import path from 'node:path';
import { ffmpeg, probe, pcm } from './ffmpeg.js';
import { onsetEnvelope, detectBeats, percentile } from './dsp.js';
import { assembleBody, renderEndscreen, renderFinal } from './render.js';
import { LOOKS } from './presets.js';
import { ROOT, loadConfig, copyFonts, brandLogo, assFor, endTexts, introFor } from './pipeline.js';

const FPS = 30, W = 1080, H = 1920;
const n3 = (x) => (+x).toFixed(4);
const even = (x) => Math.max(2, 2 * Math.round(x / 2));
const BT709 = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
const MUSICA = { foto: 'festa', testimonianza: 'matrimonio', sito: 'evento' };
const LOOK = { foto: 'caldo', testimonianza: 'naturale', sito: null };
const TRANS = { foto: ['flash', 'zoomin', 'whip', 'fade'], testimonianza: ['fade', 'dissolve'], sito: ['fade', 'slide'] };

const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// Brano dalla cartella ASSETS/musica/<stile> (a rotazione in base al nome del file)
export function pickTrack(tipo, seed) {
  const base = path.join(ROOT, 'ASSETS', 'musica');
  const pref = path.join(base, MUSICA[tipo] || 'festa');
  const list = (d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => /\.(mp3|m4a|wav|aac|ogg)$/i.test(f)).map((f) => path.join(d, f)) : []);
  let tracks = list(pref);
  if (!tracks.length) tracks = fs.existsSync(base) ? fs.readdirSync(base).flatMap((d) => list(path.join(base, d))).concat(list(base)) : [];
  if (!tracks.length) throw new Error('Nessun brano in ASSETS/musica: servono basi libere da diritti per i reel da foto');
  return tracks.sort()[hash(seed) % tracks.length];
}

// Punto della canzone da cui partire (dopo l'intro, dove l'energia sale) + beat
async function musicPlan(file, need) {
  const info = await probe(file);
  const x = await pcm(file, 8000);
  const win = 4000; // 0.5 s
  const db = [];
  for (let i = 0; i + win <= x.length; i += win) {
    let s = 0; for (let k = i; k < i + win; k++) s += x[k] * x[k];
    db.push(10 * Math.log10(s / win + 1e-10));
  }
  const p65 = percentile(db, 0.65);
  const maxStart = Math.max(0, info.duration - need - 1);
  let start = Math.min(maxStart, info.duration * 0.12);
  for (let i = Math.floor((info.duration * 0.08) / 0.5); i < db.length; i++) {
    if (i * 0.5 > maxStart) break;
    if (db[i] >= p65) { start = i * 0.5; break; }
  }
  const from = Math.max(0, start - 1);
  const y = await pcm(file, 22050, { start: from, dur: need + 6 });
  const bi = detectBeats(onsetEnvelope(y, 22050));
  const beats = bi.beats.map((b) => b + from);
  const down = bi.downbeats.map((b) => b + from);
  const s0 = down.find((d) => d >= start - 0.3) ?? beats.find((b) => b >= start) ?? start;
  const period = bi.bpm && bi.confidence > 0.2 ? 60 / bi.bpm : 0.5;
  return { start: s0, period, beats: beats.filter((b) => b >= s0 - 0.01), bpm: bi.bpm };
}

// Zone della foto con più dettagli (volti, persone, luci): griglia 6x8 sulla varianza locale
async function detailRegions(file, info) {
  const gw = 48, gh = Math.max(2, Math.round((48 * info.height) / info.width / 2) * 2);
  const { stdout } = await ffmpeg(['-i', file, '-frames:v', '1', '-vf', `scale=${gw}:${gh}:flags=area,format=gray`, '-f', 'rawvideo', '-']);
  const cols = 6, rows = Math.max(3, Math.round((6 * gh) / gw));
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let s = 0, s2 = 0, n = 0;
    for (let y = Math.floor((r * gh) / rows); y < Math.floor(((r + 1) * gh) / rows); y++)
      for (let x = Math.floor((c * gw) / cols); x < Math.floor(((c + 1) * gw) / cols); x++) { const v = stdout[y * gw + x]; s += v; s2 += v * v; n++; }
    const m = s / n;
    cells.push({ cx: (c + 0.5) / cols, cy: (r + 0.5) / rows, v: s2 / n - m * m + (m > 30 ? 50 : 0) });
  }
  cells.sort((a, b) => b.v - a.v);
  const out = [];
  for (const c of cells) {
    if (out.length >= 3) break;
    if (out.every((o) => Math.hypot(o.cx - c.cx, o.cy - c.cy) > 0.3)) out.push(c);
  }
  return out.length ? out : [{ cx: 0.5, cy: 0.45 }];
}

// Zoom + panoramica con il filtro perspective (sub-pixel, niente scatti)
function motion({ z0, z1, px0 = 0, px1 = 0, py0 = 0, py1 = 0, dur, ease = true, punch = 0 }) {
  const t = `(in/${FPS})`;
  const p = ease ? `(3*pow(clip(${t}/${n3(dur)},0,1),2)-2*pow(clip(${t}/${n3(dur)},0,1),3))` : `clip(${t}/${n3(dur)},0,1)`;
  const Z = `(${n3(z0)}+(${n3(z1 - z0)})*${p}+${n3(punch)}*exp(-${t}*7))`;
  const CX = `(W/2+W*(${n3(px0)}+(${n3(px1 - px0)})*${p}))`;
  const CY = `(H/2+H*(${n3(py0)}+(${n3(py1 - py0)})*${p}))`;
  const X = (e) => `${CX}+(${e}-W/2)/${Z}`;
  const Y = (e) => `${CY}+(${e}-H/2)/${Z}`;
  return `perspective=x0='${X(0)}':y0='${Y(0)}':x1='${X('W')}':y1='${Y(0)}':x2='${X(0)}':y2='${Y('H')}':x3='${X('W')}':y3='${Y('H')}':interpolation=cubic:eval=frame`;
}

// Un'inquadratura "virtuale" ricavata dall'immagine
async function renderImageShot({ img, info, spec, frames, look, out, workDir }) {
  const dur = frames / FPS;
  const grade = look ? `,${look.grade}${look.vignette ? ',vignette=angle=PI/5.5' : ''}` : '';
  let fc;
  if (spec.kind === 'contain') {
    // immagine intera al centro, sfondo sfocato della stessa immagine; la card può "entrare" con un'animazione
    const fgW = even(W * (spec.scala || 0.92)), fgH = even(H * 0.82);
    const entra = spec.entrata
      ? `,format=rgba,fade=t=in:st=0:d=0.5:alpha=1[fg];[bg][fg]overlay=x=(W-w)/2:y='(H-h)/2+70*pow(1-clip(t/0.7,0,1),3)':format=auto`
      : `[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`;
    fc = `[0:v]format=yuv444p,split[b][f];[b]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=30:3,eq=brightness=-0.22:saturation=0.75[bg];` +
      `[f]scale=${fgW}:${fgH}:force_original_aspect_ratio=decrease${entra},${motion({ ...spec.m, dur })}${grade},setsar=1,format=yuv420p[v]`;
  } else if (spec.kind === 'scroll') {
    // pagina lunga: scorre dall'alto in basso con partenza e arrivo morbidi
    const t = `(t/${n3(dur)})`;
    fc = `[0:v]scale=${W}:-2,crop=${W}:${H}:0:'(ih-${H})*(3*pow(clip(${t},0,1),2)-2*pow(clip(${t},0,1),3))',setsar=1,format=yuv420p[v]`;
  } else {
    // ritaglio 9:16 attorno a un punto interessante, poi zoom/panoramica
    const a = W / H;
    let ch = info.height / (spec.stringi || 1), cw = ch * a;
    if (cw > info.width) { cw = info.width / (spec.stringi || 1); ch = cw / a; }
    cw = even(Math.min(cw, info.width)); ch = even(Math.min(ch, info.height));
    const x = Math.round(Math.max(0, Math.min(info.width - cw, spec.cx * info.width - cw / 2)));
    const y = Math.round(Math.max(0, Math.min(info.height - ch, spec.cy * info.height - ch / 2)));
    fc = `[0:v]crop=${cw}:${ch}:${x}:${y},scale=${W}:${H}:flags=lanczos,${motion({ ...spec.m, dur })}${grade},setsar=1,format=yuv420p[v]`;
  }
  await ffmpeg(['-loop', '1', '-framerate', String(FPS), '-t', n3(dur + 0.5), '-i', img, '-filter_complex', fc, '-map', '[v]',
    '-frames:v', String(frames), ...BT709, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-r', String(FPS), out], { cwd: workDir });
}

// Piano delle inquadrature per tipo di contenuto
function planShots(tipo, info, regions) {
  const tall = info.height / info.width > H / W + 0.15;
  if (tipo === 'sito') {
    if (tall) return [{ kind: 'scroll', beats: 16 }, { kind: 'cover', cx: 0.5, cy: 0.3, stringi: 1.5, m: { z0: 1.0, z1: 1.08 }, beats: 8 }];
    return [
      { kind: 'contain', scala: 0.94, entrata: true, m: { z0: 1.0, z1: 1.05 }, beats: 8 },
      { kind: 'contain', scala: 0.94, m: { z0: 1.1, z1: 1.18, py0: 0.05, py1: -0.03 }, beats: 8 },
    ];
  }
  if (tipo === 'testimonianza') {
    return [
      { kind: 'contain', scala: 0.94, entrata: true, m: { z0: 1.0, z1: 1.06 }, beats: 8 },
      { kind: 'contain', scala: 0.94, m: { z0: 1.28, z1: 1.36, py0: 0.03, py1: -0.03 }, beats: 8 },
      { kind: 'contain', scala: 0.94, m: { z0: 1.12, z1: 1.0 }, beats: 4 },
    ];
  }
  // foto (orizzontale: la foto intera viene mostrata più grande, sfondo sfocato sopra e sotto)
  const [r1, r2 = r1, r3 = r1] = regions;
  const land = info.width > info.height;
  const zc = land ? 1.25 : 1.0;
  return [
    { kind: 'contain', scala: 0.94, entrata: true, m: { z0: zc, z1: zc + 0.07 }, beats: 8 },
    { kind: 'cover', cx: r1.cx, cy: r1.cy, stringi: 1.7, m: { z0: 1.0, z1: 1.12, px0: -0.02, px1: 0.02 }, beats: 4 },
    { kind: 'cover', cx: 0.5, cy: 0.5, stringi: 1, m: { z0: 1.0, z1: 1.04, punch: 0.18 }, beats: 4 },
    { kind: 'cover', cx: r2.cx, cy: r2.cy, stringi: 1.5, m: { z0: 1.12, z1: 1.0, py0: -0.02, py1: 0.02 }, beats: 4 },
    { kind: 'cover', cx: r3.cx, cy: r3.cy, stringi: 1.25, m: { z0: 1.0, z1: 1.1 }, beats: 4 },
    { kind: 'contain', scala: 0.94, m: { z0: zc + 0.1, z1: zc }, beats: 4 },
  ];
}

// tipo: 'foto' | 'testimonianza' | 'sito'
// seed: sceglie il brano (stesso seed = stesso brano; cambiandolo si ottiene una variante)
// testi: { hook, frasi: [], finale } in sovrimpressione (scritti dall'AI, vedi lib/regiaEngine.ts)
export async function fotoReel({ file, tipo = 'foto', out, workDir, seed, testi = null, log = () => {} }) {
  const cfg = loadConfig();
  const info = await probe(file);
  if (!info.width || !info.height) throw new Error('Immagine non leggibile');
  fs.mkdirSync(workDir, { recursive: true });
  copyFonts(workDir);
  const img = path.join(workDir, 'immagine.png');
  // normalizza (EXIF/rotazione, formati strani, dimensioni enormi) in un PNG pulito
  await ffmpeg(['-i', file, '-frames:v', '1', '-vf', `scale='min(3000,iw)':-2,format=rgb24`, img]);
  const nInfo = await probe(img);
  const regions = tipo === 'foto' ? await detailRegions(img, nInfo) : [];
  const specs = planShots(tipo, nInfo, regions);
  const track = pickTrack(tipo, seed ?? path.basename(file));
  const endDur = cfg.finale.attivo !== false ? Number(cfg.finale.durata) || 3.5 : 0;
  const totBeats = specs.reduce((s, x) => s + x.beats, 0);
  const mp = await musicPlan(track, totBeats * 0.6 + endDur + 2);
  log(`Reel da ${tipo}: ${specs.length} inquadrature, musica ${path.basename(track)} (${Math.round(mp.bpm || 0)} BPM)`);

  // tagli sui beat: durata di ogni inquadratura = N battute (limitata tra 1.4 e 4 secondi)
  const cuts = [0];
  let bi = 0;
  for (const sp of specs) {
    const target = Math.min(4, Math.max(1.4, sp.beats * mp.period));
    const want = cuts[cuts.length - 1] + target;
    let bestT = want;
    for (let k = bi; k < mp.beats.length; k++) { const t = mp.beats[k] - mp.start; if (Math.abs(t - want) < Math.abs(bestT - want)) { bestT = t; bi = k; } if (t > want + 1) break; }
    cuts.push(bestT > cuts[cuts.length - 1] + 0.8 ? bestT : want);
  }
  const trans = TRANS[tipo];
  const shots = specs.map((sp, i) => ({ sp, a: cuts[i], b: cuts[i + 1], transOut: i < specs.length - 1 ? { type: trans[i % trans.length], dur: tipo === 'foto' ? 0.3 : 0.5 } : null }));
  const F = (t) => Math.round(t * FPS);
  shots.forEach((s, i) => {
    const hin = i > 0 && shots[i - 1].transOut ? shots[i - 1].transOut.half : 0;
    const hout = s.transOut ? Math.max(1, Math.round((s.transOut.dur * FPS) / 2)) : 0;
    if (s.transOut) { s.transOut.half = hout; s.transOut.frames = 2 * hout; }
    s.frames = F(s.b) - F(s.a) + hin + hout;
  });

  const look = LOOK[tipo] ? LOOKS[LOOK[tipo]] : null;
  const files = [];
  for (let i = 0; i < shots.length; i++) {
    const f = path.join(workDir, `shot_${i}.mkv`);
    await renderImageShot({ img, info: nInfo, spec: shots[i].sp, frames: shots[i].frames, look, out: f, workDir });
    files.push(f);
  }
  const body = path.join(workDir, 'corpo.mkv');
  const bodyFrames = await assembleBody({ shots, files, fps: FPS, withAudio: false, out: body, workDir });

  let end = null, endFrames = 0;
  const logo = brandLogo(cfg);
  if (endDur) {
    end = path.join(workDir, 'finale.mkv');
    endFrames = await renderEndscreen({ bgFrame: img, logo, W, H, dur: endDur, fps: FPS, out: end, workDir });
  }
  const XF = end ? Math.round(0.5 * FPS) : 0;
  const S = { titolo: '', preset: MUSICA[tipo] || 'festa', testi: testi || null, intro: true };
  const ass = assFor(cfg, S, { W, H, bodyT: bodyFrames / FPS, hasLogo: !!logo, words: null, end: end ? endTexts(cfg, S, (bodyFrames - XF) / FPS, endDur) : null });
  fs.writeFileSync(path.join(workDir, 'testi.ass'), ass, 'utf8');
  const T = await renderFinal({
    body, bodyFrames, end, endFrames, ass: 'testi.ass', fps: FPS, audio: { type: 'music', file: track, start: mp.start }, out, workDir,
    intro: introFor(cfg, S, W, H),
  });
  log(`✔ Reel da ${tipo} pronto (${T.toFixed(1)}s)`);
  return { file: out, durata: +T.toFixed(1), musica: path.basename(track) };
}
