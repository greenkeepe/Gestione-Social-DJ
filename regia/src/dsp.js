// Elaborazione del segnale: FFT, inviluppo degli attacchi, BPM/beat, correlazione per la sincronizzazione.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

export function percentile(arr, p) {
  const a = Array.from(arr).filter(Number.isFinite).sort((x, y) => x - y);
  if (!a.length) return 0;
  return a[Math.min(a.length - 1, Math.max(0, Math.floor(p * (a.length - 1))))];
}

export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = (-2 * Math.PI) / len;
    for (let k = 0; k < half; k++) {
      const cr = Math.cos(ang * k), ci = Math.sin(ang * k);
      for (let i = k; i < n; i += len) {
        const b = i + half;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[i] - xr; im[b] = im[i] - xi;
        re[i] += xr; im[i] += xi;
      }
    }
  }
}

// Spectral flux: picchi in corrispondenza di colpi di cassa, applausi, attacchi.
export function onsetEnvelope(x, sr, { win = 1024, hop = 512, lowHz = 150, bands = null } = {}) {
  const nF = x.length >= win ? Math.floor((x.length - win) / hop) + 1 : 0;
  const env = new Float32Array(nF);
  const low = new Float32Array(nF);
  const bandBins = (bands || []).map(([a, b]) => [Math.max(1, Math.floor((a * win) / sr)), Math.min(win / 2, Math.ceil((b * win) / sr))]);
  const bandEnv = bandBins.map(() => new Float32Array(nF));
  const bandOf = new Int8Array(win / 2 + 1).fill(-1);
  bandBins.forEach(([a, b], i) => { for (let k = a; k < b; k++) bandOf[k] = i; });
  const hann = new Float64Array(win);
  for (let i = 0; i < win; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / win);
  const re = new Float64Array(win), im = new Float64Array(win);
  const prev = new Float64Array(win / 2 + 1);
  const lowBin = Math.max(1, Math.ceil((lowHz * win) / sr));
  for (let f = 0; f < nF; f++) {
    const o = f * hop;
    for (let i = 0; i < win; i++) { re[i] = x[o + i] * hann[i]; im[i] = 0; }
    fft(re, im);
    let flux = 0, lf = 0;
    for (let k = 1; k <= win / 2; k++) {
      const m = Math.log1p(100 * Math.hypot(re[k], im[k]));
      const d = f > 0 ? m - prev[k] : 0;
      if (d > 0) {
        flux += d;
        if (k <= lowBin) lf += d;
        const b = bandOf[k];
        if (b >= 0) bandEnv[b][f] += d;
      }
      prev[k] = m;
    }
    env[f] = flux;
    low[f] = lf;
  }
  return { env, low, bands: bandEnv, rate: sr / hop };
}

// Sottrae la media mobile e tiene la parte positiva.
function localNorm(env, rate, winSec = 0.4) {
  const n = env.length, h = Math.max(1, Math.round((winSec * rate) / 2));
  const out = new Float64Array(n);
  let s = 0, c = 0, lo = 0, hi = -1;
  for (let i = 0; i < n; i++) {
    while (hi < Math.min(n - 1, i + h)) { s += env[++hi]; c++; }
    while (lo < i - h) { s -= env[lo++]; c--; }
    out[i] = Math.max(0, env[i] - s / c);
  }
  return out;
}

function combScore(e, period, phase) {
  let s = 0, c = 0;
  for (let t = phase; t < e.length - 1; t += period) {
    const i = Math.floor(t), fr = t - i;
    s += e[i] * (1 - fr) + e[i + 1] * fr;
    c++;
  }
  return c ? s / c : 0;
}

// Tempo + griglia dei beat. Restituisce tempi in secondi relativi all'inizio del segnale.
export function detectBeats(envObj, { minBpm = 80, maxBpm = 180, preferBpm = 124 } = {}) {
  const { env, low, rate } = envObj;
  const e = localNorm(env, rate);
  const n = e.length;
  if (n < rate * 4) return { bpm: 0, beats: [], downbeats: [], confidence: 0 };
  const minLag = Math.floor((rate * 60) / maxBpm), maxLag = Math.ceil((rate * 60) / minBpm);
  const ac = [];
  let best = -Infinity, bestLag = minLag;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = 0; i + lag < n; i++) s += e[i] * e[i + lag];
    s /= n - lag;
    ac.push(s);
    const bpm = (60 * rate) / lag;
    const w = Math.exp(-0.5 * Math.pow(Math.log2(bpm / preferBpm) / 0.7, 2));
    if (s * w > best) { best = s * w; bestLag = lag; }
  }
  // 0..1: quanto il segnale si ripete uguale a distanza di un beat (musica ~0.4+, parlato ~0.1)
  let e0 = 0;
  for (let i = 0; i < n; i++) e0 += e[i] * e[i];
  const confidence = ac[bestLag - minLag] / (e0 / n || 1e-9);

  // Affina periodo e fase massimizzando l'allineamento della griglia.
  let bestP = bestLag, bestPh = 0, bestS = -Infinity;
  for (let p = bestLag - 1; p <= bestLag + 1; p += 0.02) {
    for (let ph = 0; ph < p; ph += 0.5) {
      const s = combScore(e, p, ph);
      if (s > bestS) { bestS = s; bestP = p; bestPh = ph; }
    }
  }
  const beats = [];
  for (let t = bestPh; t < n; t += bestP) {
    // piccolo aggancio al picco locale (±1 frame) per assorbire micro-derive
    const i = Math.round(t);
    let bi = i;
    for (let k = i - 1; k <= i + 1; k++) if (k >= 0 && k < n && e[k] > e[bi]) bi = k;
    beats.push((0.7 * t + 0.3 * bi) / rate);
  }
  // Downbeat: offset (0..3) con più energia sulle basse frequenze.
  const lowN = localNorm(low, rate);
  let bestOff = 0, bestLow = -Infinity;
  for (let off = 0; off < 4; off++) {
    let s = 0;
    for (let b = off; b < beats.length; b += 4) s += lowN[Math.min(n - 1, Math.round(beats[b] * rate))];
    if (s > bestLow) { bestLow = s; bestOff = off; }
  }
  const downbeats = beats.filter((_, i) => i % 4 === bestOff);
  return { bpm: (60 * rate) / bestP, beats, downbeats, downbeatOffset: bestOff, confidence };
}

// ---------- Sincronizzazione audio ----------
// Impronta: energia (log) in 16 bande logaritmiche, 50 volte al secondo. Cattura quali note/suoni ci sono,
// non solo i colpi, quindi distingue anche parti di musica con lo stesso ritmo.
export function bandEnergies(x, sr, { win = 512, hop = 160, nb = 16, lo = 100, hi = 3800 } = {}) {
  const nF = x.length >= win ? Math.floor((x.length - win) / hop) + 1 : 0;
  const edges = Array.from({ length: nb + 1 }, (_, i) => Math.round((lo * Math.pow(hi / lo, i / nb) * win) / sr));
  const bands = Array.from({ length: nb }, () => new Float32Array(nF));
  const hann = new Float64Array(win);
  for (let i = 0; i < win; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / win);
  const re = new Float64Array(win), im = new Float64Array(win);
  for (let f = 0; f < nF; f++) {
    const o = f * hop;
    for (let i = 0; i < win; i++) { re[i] = x[o + i] * hann[i]; im[i] = 0; }
    fft(re, im);
    for (let b = 0; b < nb; b++) {
      let s = 0;
      for (let k = edges[b]; k < Math.max(edges[b] + 1, edges[b + 1]); k++) s += re[k] * re[k] + im[k] * im[k];
      bands[b][f] = Math.log10(s + 1e-9);
    }
  }
  return { bands, rate: sr / hop };
}

// toglie la media mobile (~1 s: compensa microfono/equalizzazione diversi), normalizza e limita gli estremi
function hpNorm(a, rate) {
  const n = a.length, h = Math.max(1, Math.round(rate / 2));
  const out = new Float64Array(n);
  let s = 0, c = 0, lo = 0, hi = -1;
  for (let i = 0; i < n; i++) {
    while (hi < Math.min(n - 1, i + h)) { s += a[++hi]; c++; }
    while (lo < i - h) { s -= a[lo++]; c--; }
    out[i] = a[i] - s / c;
  }
  let m = 0; for (const v of out) m += v; m /= n || 1;
  let sd = 0; for (const v of out) sd += (v - m) ** 2; sd = Math.sqrt(sd / (n || 1)) || 1;
  for (let i = 0; i < n; i++) out[i] = Math.max(-4, Math.min(4, (out[i] - m) / sd));
  return out;
}

// Prepara la traccia principale una volta sola; restituisce una funzione che trova ogni clip al suo interno.
export function makeSyncer(masterBands, maxClipLen, rate) {
  const Al = masterBands[0].length;
  let N = 1; while (N < Al + maxClipLen) N <<= 1;
  const M = masterBands.map((b) => {
    const re = new Float64Array(N), im = new Float64Array(N);
    re.set(hpNorm(b, rate));
    fft(re, im);
    return [re, im];
  });
  return (clipBands) => {
    const Bl = clipBands[0].length;
    const accR = new Float64Array(N), accI = new Float64Array(N);
    const cr = new Float64Array(N), ci = new Float64Array(N);
    for (let b = 0; b < M.length; b++) {
      cr.fill(0); ci.fill(0);
      cr.set(hpNorm(clipBands[b], rate));
      fft(cr, ci);
      const [mr, mi] = M[b];
      for (let k = 0; k < N; k++) {
        accR[k] += mr[k] * cr[k] + mi[k] * ci[k];
        accI[k] += mi[k] * cr[k] - mr[k] * ci[k];
      }
    }
    for (let k = 0; k < N; k++) accI[k] = -accI[k];
    fft(accR, accI); // IFFT tramite coniugazione
    const norm = N * M.length;
    const peaks = [];
    for (let lag = -Math.floor(Bl * 0.4); lag <= Al - Math.floor(Bl * 0.6); lag++) {
      const overlap = Math.min(Al, lag + Bl) - Math.max(0, lag);
      if (overlap < Bl * 0.6) continue;
      peaks.push([lag, accR[(lag + N) % N] / norm / overlap]); // ~ correlazione media sulle bande
    }
    peaks.sort((x, y) => y[1] - x[1]);
    const top = [];
    for (const p of peaks) {
      if (top.length >= 5) break;
      if (top.every((t) => Math.abs(t[0] - p[0]) > rate)) top.push(p);
    }
    if (!top.length) return { lag: 0, score: 0, ratio: 1, candidates: [] };
    return {
      lag: top[0][0], score: top[0][1], ratio: top[1] ? top[0][1] / Math.max(1e-6, top[1][1]) : 9,
      candidates: top.map(([lag, score]) => ({ lag, score })),
    };
  };
}
