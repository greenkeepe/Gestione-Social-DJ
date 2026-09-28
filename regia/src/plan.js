// Regia: decide quali pezzi usare, dove tagliare, quali transizioni e movimenti di camera applicare.
import { clamp, percentile } from './dsp.js';
import { WIN } from './analyze.js';

// Punteggio 0..1 per ogni finestra di ogni clip + marcatura dei "tempi morti".
export function scoreClips(clips, preset) {
  const all = clips.flatMap((c) => c.an.windows);
  const loudAll = clips.flatMap((c) => c.an.audio?.loud || []).filter((v) => v > -90);
  const pm90 = percentile(all.map((w) => w.motion), 0.9) || 1;
  const pm10 = percentile(all.map((w) => w.motion), 0.1);
  const ps10 = percentile(all.map((w) => w.sharp), 0.1), ps90 = percentile(all.map((w) => w.sharp), 0.9) || 1;
  const pl10 = percentile(loudAll, 0.1), pl90 = percentile(loudAll, 0.9);
  const W = preset.weights;
  for (const c of clips) {
    const n = c.an.windows.length;
    c.scores = new Array(n);
    c.dead = new Array(n);
    for (let i = 0; i < n; i++) {
      const w = c.an.windows[i];
      const motionN = clamp(w.motion / pm90);
      const sharpN = clamp((w.sharp - ps10) / (ps90 - ps10 || 1));
      const brightN = clamp((w.bright - 12) / 55);
      const ld = c.an.audio?.loud?.[i];
      const loudN = ld === undefined || pl90 <= pl10 ? 0.5 : clamp((ld - pl10) / (pl90 - pl10));
      const shaky = w.motion > 2.4 * pm90 && sharpN < 0.35;
      c.scores[i] = W.motion * motionN + W.sharp * sharpN + W.bright * brightN + W.loud * loudN - (shaky ? 0.35 : 0);
      c.dead[i] =
        w.bright < 14 || // nero / obiettivo coperto
        sharpN < 0.05 || // completamente sfocato
        (w.motion <= pm10 * 0.5 && loudN < 0.15) || // fermo e silenzioso
        shaky ||
        (n > 6 && (i === 0 || i === n - 1)); // inizio/fine ripresa (mano che preme REC)
    }
  }
}

const goodSeconds = (clips) => clips.reduce((s, c) => s + c.dead.filter((d) => !d).length * WIN, 0);

// Sceglie il pezzo di musica più energico (e, se è audio dell'evento, più coperto dalle riprese).
export function chooseMusicWindow(music, len, clips) {
  const loud = music.an.loud;
  const nW = Math.max(1, Math.floor(len / WIN));
  if (music.info.duration <= len + 1) return 0;
  const cover = (t0) => {
    if (!music.isEvent) return 0;
    let c = 0, n = 0;
    for (let t = t0; t < t0 + len; t += 1) {
      n++;
      if (clips.some((k) => k.offset != null && t >= k.offset && t <= k.offset + k.info.duration)) c++;
    }
    return c / n;
  };
  const cands = [];
  for (let s = 0; s + nW <= loud.length; s += 2) {
    let e = 0;
    for (let i = s; i < s + nW; i++) e += Math.pow(10, loud[i] / 10);
    cands.push({ t: s * WIN, db: 10 * Math.log10(e / nW + 1e-10) });
  }
  const maxDb = Math.max(...cands.map((c) => c.db));
  let best = cands[0];
  let bestS = -Infinity;
  for (const c of cands) {
    const s = (c.db - maxDb) / 6 + 1.5 * cover(c.t) - (c.t < 3 ? 0.3 : 0);
    if (s > bestS) { bestS = s; best = c; }
  }
  return best.t;
}

export function windowStats(c, s, e) {
  const i0 = Math.max(0, Math.floor(s / WIN)), i1 = Math.min(c.scores.length, Math.ceil(e / WIN));
  let sum = 0, mx = -1, dead = 0, n = 0, cx = [], cxW = [];
  for (let i = i0; i < i1; i++) {
    sum += c.scores[i]; mx = Math.max(mx, c.scores[i]); n++;
    if (c.dead[i]) dead++;
    cx.push(c.an.windows[i]?.cx ?? 0.5);
    cxW.push(c.an.windows[i]?.motion ?? 0);
  }
  return { mean: n ? sum / n : 0, max: mx, deadFrac: n ? dead / n : 1, n, cx, cxW };
}

export function framing(c, s, e) {
  const half = (a, b) => {
    const st = windowStats(c, a, b);
    let sw = 0, sx = 0;
    st.cx.forEach((x, i) => { sw += st.cxW[i] + 0.01; sx += x * (st.cxW[i] + 0.01); });
    const x = sw ? sx / sw : 0.5;
    return 0.5 + (x - 0.5) * 0.7; // attenua: evita inquadrature troppo decentrate
  };
  const m = (s + e) / 2;
  const a = half(s, m), b = half(m, e);
  const d = clamp(b - a, -0.12, 0.12);
  return { cx0: a, cx1: a + d };
}

// ---------- MONTAGGIO MUSICALE (feste, DJ set, matrimoni) ----------
export function planHighlight({ clips, music, beatInfo, winStart, preset, target, log }) {
  const beats = beatInfo.beats.filter((b) => b >= winStart - 0.05);
  const G = goodSeconds(clips);
  if (G < target * 1.1) {
    const nt = Math.max(6, Math.floor(G * 0.85));
    if (nt < target) { log?.(`Materiale utile ~${G.toFixed(0)}s: durata ridotta a ${nt}s`); target = nt; }
  }
  // punto di partenza: primo downbeat dopo winStart
  let start = beatInfo.downbeats.find((d) => d >= winStart - 0.05) ?? beats[0] ?? winStart;
  const period = beatInfo.bpm ? 60 / beatInfo.bpm : 0;

  const loudAt = (t) => music.an.loud[Math.min(music.an.loud.length - 1, Math.max(0, Math.floor(t / WIN)))];
  const wl = music.an.loud.slice(Math.floor(winStart / WIN), Math.floor((winStart + target) / WIN));
  const l10 = percentile(wl, 0.1), l90 = percentile(wl, 0.9);
  const energy = (t) => clamp((loudAt(t) - l10) / (l90 - l10 || 1));

  // ---- punti di taglio ----
  const cuts = [start];
  if (period > 0 && beatInfo.confidence > 0.35) {
    let bi = beats.findIndex((b) => Math.abs(b - start) < 0.06);
    if (bi < 0) bi = 0;
    let k = 0;
    while (true) {
      const t = beats[bi];
      let nb = k === 0 ? preset.firstBeats : energy(t) > 0.6 ? preset.beatsHigh : preset.beatsLow;
      while (nb * period < preset.minShot) nb *= 2;
      if (bi + nb >= beats.length) break;
      const next = beats[bi + nb];
      if (next - start > target + (next - t) * 0.5) break;
      cuts.push(next);
      bi += nb;
      k++;
    }
  } else {
    log?.('Beat non rilevato con sicurezza: tagli a ritmo regolare');
    for (let t = start + preset.fallbackShot; t <= start + target + 0.01; t += preset.fallbackShot) cuts.push(t);
  }
  if (cuts.length < 2) cuts.push(start + Math.min(target, 3));

  // ---- transizioni ai confini ----
  let ti = 0;
  const trans = []; // trans[j] = transizione tra shot j e j+1
  for (let j = 1; j < cuts.length - 1; j++) {
    const beatIdx = period ? Math.round((cuts[j] - start) / period) : j;
    const onPhrase = beatIdx % preset.phrase === 0;
    if (onPhrase || !preset.hardCuts) {
      const type = preset.transitions[ti++ % preset.transitions.length];
      const dur = Math.min(type === 'flash' ? 0.3 : preset.transDur, (cuts[j] - cuts[j - 1]) * 0.45, (cuts[j + 1] - cuts[j]) * 0.45);
      trans.push({ type, dur });
    } else trans.push(null);
  }

  const nSlots = cuts.length - 1;
  const slots = [];
  for (let k = 0; k < nSlots; k++) {
    const tin = k > 0 && trans[k - 1] ? trans[k - 1].dur / 2 : 0;
    const tout = k < nSlots - 1 && trans[k] ? trans[k].dur / 2 : 0;
    slots.push({ k, a: cuts[k], b: cuts[k + 1], tin, tout, need: cuts[k + 1] - cuts[k] + tin + tout });
  }

  // ---- 1) inquadrature sincronizzate con l'audio dell'evento ----
  const used = new Map();
  const markUsed = (id, s, e) => { if (!used.has(id)) used.set(id, []); used.get(id).push([s, e]); };
  const isFree = (id, s, e) => !(used.get(id) || []).some(([a, b]) => s < b + 0.5 && e > a - 0.5);
  const shots = new Array(nSlots).fill(null);
  if (music.isEvent) {
    let prev = null, run = 0;
    for (const sl of slots) {
      let best = null, bestS = -Infinity;
      for (const c of clips) {
        if (c.offset == null) continue;
        const s = sl.a - sl.tin - c.offset, e = sl.b + sl.tout - c.offset;
        if (s < 0.2 || e > c.info.duration - 0.2 || !isFree(c.id, s, e)) continue;
        const st = windowStats(c, s, e);
        if (st.deadFrac > 0.25) continue;
        if (c.id === prev && run >= 2) continue; // max 2 inquadrature di fila dalla stessa ripresa
        const sc = st.mean - (c.id === prev ? 0.2 : 0);
        if (sc > bestS) { bestS = sc; best = { c, s, e }; }
      }
      if (best && bestS > 0.2) {
        shots[sl.k] = { clipId: best.c.id, srcStart: best.s, synced: true, ...framing(best.c, best.s, best.e) };
        markUsed(best.c.id, best.s, best.e);
        run = best.c.id === prev ? run + 1 : 1;
        prev = best.c.id;
      } else { prev = null; run = 0; }
    }
  }

  // ---- 2) momenti migliori per gli slot rimasti ----
  const free = slots.filter((s) => !shots[s.k]);
  if (free.length) {
    const L = Math.max(...free.map((s) => s.need));
    const cands = [];
    for (const c of clips) {
      if (!c.info.hasVideo) continue;
      for (let s = 0.25; s + L <= c.info.duration - 0.25; s += WIN) {
        const st = windowStats(c, s, s + L);
        cands.push({ c, s, score: st.mean + 0.3 * st.max - st.deadFrac * 1.5, deadFrac: st.deadFrac });
      }
      if (c.info.duration - 0.2 < L && c.info.duration > 0.5) {
        const st = windowStats(c, 0, c.info.duration);
        cands.push({ c, s: 0, score: st.mean - 0.2 - st.deadFrac, deadFrac: st.deadFrac, short: true });
      }
    }
    cands.sort((x, y) => y.score - x.score);
    const nClips = new Set(cands.map((x) => x.c.id)).size || 1;
    const picks = [];
    const perClip = new Map();
    const pass = (cap, maxDead, allowOverlap) => {
      for (const cd of cands) {
        if (picks.length >= free.length) return;
        if (cd.deadFrac > maxDead) continue;
        if ((perClip.get(cd.c.id) || 0) >= cap) continue;
        if (!allowOverlap && !isFree(cd.c.id, cd.s, cd.s + L)) continue;
        if (allowOverlap && picks.some((p) => p.c.id === cd.c.id && Math.abs(p.s - cd.s) < 1)) continue;
        picks.push(cd);
        perClip.set(cd.c.id, (perClip.get(cd.c.id) || 0) + 1);
        markUsed(cd.c.id, cd.s, cd.s + L);
      }
    };
    pass(Math.ceil(free.length / nClips) + 1, 0.1, false);
    pass(Infinity, 0.1, false);
    pass(Infinity, 0.5, false);
    pass(Infinity, 1, true);
    // ordine cronologico reale (posizione sincronizzata o orario del file) = racconto della serata
    const when = (p) => (p.c.offset != null ? p.c.offset : p.c.info.creation ? Date.parse(p.c.info.creation) / 1000 - (clips[0].info.creation ? Date.parse(clips[0].info.creation) / 1000 : 0) : null);
    if (picks.every((p) => when(p) != null)) picks.sort((x, y) => when(x) + x.s - (when(y) + y.s));
    else picks.sort((x, y) => x.c.order - y.c.order || x.s - y.s);
    // mai più di 2 inquadrature di fila dalla stessa ripresa
    for (let i = 2; i < picks.length; i++) {
      if (picks[i].c.id === picks[i - 1].c.id && picks[i].c.id === picks[i - 2].c.id) {
        const j = picks.findIndex((p, k) => k > i && p.c.id !== picks[i].c.id);
        if (j > 0) [picks[i], picks[j]] = [picks[j], picks[i]];
      }
    }
    free.forEach((sl, i) => {
      const p = picks[i % Math.max(1, picks.length)];
      if (!p) return;
      const s = clamp(p.s + (L - sl.need) / 2, 0, Math.max(0, p.c.info.duration - sl.need));
      shots[sl.k] = { clipId: p.c.id, srcStart: s, synced: false, ...framing(p.c, s, s + sl.need) };
    });
  }

  // ---- movimenti di camera ----
  let zi = 0;
  const out = [];
  for (const sl of slots) {
    const sh = shots[sl.k];
    if (!sh) continue;
    let zoom = preset.zooms[zi++ % preset.zooms.length];
    const tIn = sl.k > 0 ? trans[sl.k - 1] : null;
    if (zoom === 'punch' && (tIn || preset.punchAmt === 0)) zoom = 'push';
    if (preset.punchAmt > 0 && tIn?.type === 'flash') zoom = 'punch';
    out.push({
      ...sh,
      slotStart: sl.a, slotEnd: sl.b, tin: sl.tin, tout: sl.tout,
      transOut: sl.k < nSlots - 1 ? trans[sl.k] : null,
      zoom, zoomAmt: zoom === 'punch' ? preset.punchAmt : preset.zoomAmt,
    });
  }
  return { mode: 'highlight', start, end: cuts[cuts.length - 1], bpm: beatInfo.bpm, shots: out };
}

// ---------- PARLATO (discorsi, brindisi, interviste): taglia pause e silenzi ----------
export function speechRegions(rms, rate) {
  const floor = percentile(rms, 0.15), peak = percentile(rms, 0.97);
  const thr = Math.max(floor + 9, peak - 28);
  const regs = [];
  let s = -1;
  for (let i = 0; i <= rms.length; i++) {
    const on = i < rms.length && rms[i] > thr;
    if (on && s < 0) s = i;
    if (!on && s >= 0) { regs.push([s / rate, i / rate]); s = -1; }
  }
  const merged = [];
  for (const r of regs) {
    const last = merged[merged.length - 1];
    if (last && r[0] - last[1] < 0.45) last[1] = r[1];
    else merged.push([...r]);
  }
  const dur = rms.length / rate;
  const padded = merged
    .filter(([a, b]) => b - a >= 0.3)
    .map(([a, b]) => [Math.max(0, a - 0.12), Math.min(dur, b + 0.2)]);
  const final = [];
  for (const r of padded) {
    const last = final[final.length - 1];
    if (last && r[0] <= last[1]) last[1] = r[1];
    else final.push(r);
  }
  return final;
}

export function planSpeech({ clips, master, fps, log }) {
  const shots = [];
  let removed = 0, kept = 0;
  let zi = 0;
  for (const c of clips) {
    if (!c.info.hasVideo) continue;
    let rms, rate, audioOffset = null;
    if (master && c.offset != null && master.an.rms) {
      rate = master.an.rmsRate;
      const i0 = Math.max(0, Math.round(c.offset * rate));
      rms = master.an.rms.slice(i0, i0 + Math.round(c.info.duration * rate));
      audioOffset = c.offset;
    } else if (c.an.audio) {
      rms = c.an.audio.rms; rate = c.an.audio.rmsRate;
    } else continue;
    const regs = speechRegions(rms, rate);
    const tot = regs.reduce((s, [a, b]) => s + b - a, 0);
    removed += c.info.duration - tot; kept += tot;
    for (const [a, b] of regs) {
      const len = b - a;
      const parts = Math.max(1, Math.ceil(len / 4.5));
      const frames = Math.round(len * fps);
      let f0 = 0;
      for (let p = 0; p < parts; p++) {
        const f1 = Math.round(((p + 1) * frames) / parts);
        const s = a + f0 / fps, d = (f1 - f0) / fps;
        const tight = zi++ % 2 === 1;
        shots.push({
          clipId: c.id, srcStart: s, frames: f1 - f0, dur: d,
          audio: { file: audioOffset != null ? master.info.file : c.info.file, start: s + (audioOffset ?? 0) },
          fadeIn: p === 0, fadeOut: p === parts - 1,
          zoom: 'hold', zoomAmt: tight ? 0.14 : 0.0,
          ...framing(c, s, s + d),
        });
        f0 = f1;
      }
    }
  }
  log?.(`Parlato: tenuti ${kept.toFixed(1)}s, tolti ${removed.toFixed(1)}s di pause/silenzi`);
  return { mode: 'speech', shots };
}

// ---------- per l'editor ----------

// I momenti migliori di tutto il girato (per "cambia momento" nell'editor), ordinati dal più bello.
export function momentPool(clips, n = 60) {
  const cands = [];
  for (const c of clips) {
    if (!c.info.hasVideo) continue;
    for (let s = 0.5; s + 2 <= c.info.duration - 0.25; s += WIN) {
      const st = windowStats(c, s, s + 2);
      if (st.deadFrac > 0.25) continue;
      cands.push({ clipId: c.id, t: +(s + 1).toFixed(2), score: +st.mean.toFixed(3) });
    }
  }
  cands.sort((a, b) => b.score - a.score);
  const out = [];
  for (const k of cands) {
    if (out.length >= n) break;
    if (out.some((o) => o.clipId === k.clipId && Math.abs(o.t - k.t) < 2.5)) continue;
    out.push(k);
  }
  return out;
}

// Fotogrammi esatti di ogni inquadratura, dai punti di taglio (slotStart/slotEnd) e dalle transizioni.
// `src` = istante della ripresa che coincide con il taglio; il render parte da src - metà transizione in ingresso.
export function computeHighlightFrames(shots, fps) {
  const start = shots[0].slotStart;
  const F = (t) => Math.round((t - start) * fps);
  shots[shots.length - 1].transOut = null;
  shots.forEach((s, i) => {
    const hin = i > 0 && shots[i - 1].transOut ? shots[i - 1].transOut.half : 0;
    const hout = s.transOut ? Math.max(1, Math.round((s.transOut.dur * fps) / 2)) : 0;
    if (s.transOut) { s.transOut.half = hout; s.transOut.frames = 2 * hout; }
    s.frames = F(s.slotEnd) - F(s.slotStart) + hin + hout;
    s.srcStart = Math.max(0, s.src - hin / fps);
  });
  return F(shots[shots.length - 1].slotEnd);
}
