// Analisi di ogni clip: per ogni mezzo secondo misura luce, nitidezza, movimento, punto d'interesse e volume.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { grayFrames, pcm } from './ffmpeg.js';
import { bandEnergies } from './dsp.js';

export const WIN = 0.5; // secondi per finestra di analisi
const FPS = 4;
const AUDIO_SR = 8000;
const CACHE_VERSION = 5;

function cacheFile(cacheDir, info) {
  const st = fs.statSync(info.file);
  const key = crypto.createHash('md5').update(`${CACHE_VERSION}|${info.file}|${st.size}|${st.mtimeMs}`).digest('hex');
  return path.join(cacheDir, key + '.json');
}

export async function analyzeAudioTrack(file, duration) {
  const x = await pcm(file, AUDIO_SR);
  // RMS a 50 Hz (20 ms) in dB: serve per trovare silenzi e parlato
  const hop = AUDIO_SR / 50;
  const nR = Math.floor(x.length / hop);
  const rms = new Array(nR);
  for (let f = 0; f < nR; f++) {
    let s = 0;
    for (let i = f * hop; i < (f + 1) * hop; i++) s += x[i] * x[i];
    rms[f] = +(10 * Math.log10(s / hop + 1e-10)).toFixed(1);
  }
  // impronta audio a 50 Hz: serve per sincronizzare clip diverse con la traccia principale
  const { bands, rate: syncRate } = bandEnergies(x, AUDIO_SR);
  const nW = Math.ceil(duration / WIN);
  const loud = new Array(nW).fill(-100);
  const per = WIN * 50;
  for (let w = 0; w < nW; w++) {
    let s = 0, c = 0;
    for (let f = w * per; f < Math.min(nR, (w + 1) * per); f++) { s += Math.pow(10, rms[f] / 10); c++; }
    if (c) loud[w] = +(10 * Math.log10(s / c + 1e-10)).toFixed(1);
  }
  return { rms, rmsRate: 50, sync: bands.map((b) => Array.from(b, (v) => +v.toFixed(2))), syncRate, loud };
}

export async function analyzeClip(info, { cacheDir, onProgress } = {}) {
  const cf = cacheDir ? cacheFile(cacheDir, info) : null;
  if (cf && fs.existsSync(cf)) {
    try { return JSON.parse(fs.readFileSync(cf, 'utf8')); } catch { /* ricalcola */ }
  }
  const result = { windows: [], audio: null };
  const nW = Math.ceil(info.duration / WIN);

  if (info.hasVideo) {
    const aw = 64;
    const ah = Math.max(2, Math.round((aw * info.height) / info.width / 2) * 2);
    const { data, n } = await grayFrames(info.file, aw, ah, FPS, { duration: info.duration, onProgress: (p) => onProgress?.(p * 0.8) });
    const size = aw * ah;
    const fr = [];
    for (let f = 0; f < n; f++) {
      const o = f * size;
      let sum = 0, lap = 0, mot = 0, mx = 0;
      for (let y = 0; y < ah; y++) {
        for (let x = 0; x < aw; x++) {
          const i = o + y * aw + x;
          const v = data[i];
          sum += v;
          if (x > 0 && y > 0 && x < aw - 1 && y < ah - 1) {
            lap += Math.abs(4 * v - data[i - 1] - data[i + 1] - data[i - aw] - data[i + aw]);
          }
          if (f > 0) {
            const d = Math.abs(v - data[i - size]);
            mot += d;
            mx += d * x;
          }
        }
      }
      fr.push({
        bright: sum / size,
        sharp: lap / ((aw - 2) * (ah - 2)),
        motion: f > 0 ? mot / size : 0,
        cx: mot > 0 ? mx / mot / (aw - 1) : 0.5,
        cw: mot,
      });
    }
    for (let w = 0; w < nW; w++) {
      const fs_ = fr.slice(Math.floor(w * WIN * FPS), Math.floor((w + 1) * WIN * FPS));
      if (!fs_.length) { result.windows.push({ bright: 0, sharp: 0, motion: 0, cx: 0.5 }); continue; }
      const avg = (k) => fs_.reduce((s, f) => s + f[k], 0) / fs_.length;
      const cwSum = fs_.reduce((s, f) => s + f.cw, 0);
      result.windows.push({
        bright: +avg('bright').toFixed(1),
        sharp: +avg('sharp').toFixed(2),
        motion: +avg('motion').toFixed(2),
        cx: +(cwSum > 0 ? fs_.reduce((s, f) => s + f.cx * f.cw, 0) / cwSum : 0.5).toFixed(3),
      });
    }
  }
  if (info.hasAudio) {
    result.audio = await analyzeAudioTrack(info.file, info.duration);
  }
  onProgress?.(1);
  if (cf) {
    fs.mkdirSync(path.dirname(cf), { recursive: true });
    fs.writeFileSync(cf, JSON.stringify(result));
  }
  return result;
}
