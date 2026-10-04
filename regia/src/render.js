// Rendering con ffmpeg: inquadrature -> corpo montato -> schermata finale -> video finale con testi e audio.
import { ffmpeg, probe } from './ffmpeg.js';
import { XFADE } from './presets.js';

const even = (x) => Math.max(2, 2 * Math.round(x / 2));
const n3 = (x) => (+x).toFixed(4);
// Modalità bozza (anteprima reale nell'editor): stessi effetti, codifica molto più veloce.
let DRAFT = false;
export const setDraft = (v) => { DRAFT = !!v; };
const encMid = () => (DRAFT ? ['-preset', 'ultrafast', '-crf', '23'] : ['-preset', 'veryfast', '-crf', '15']);
const encFinal = () => (DRAFT ? ['-preset', 'veryfast', '-crf', '26'] : ['-preset', 'medium', '-crf', '19', '-maxrate', '9M', '-bufsize', '18M']);
// tag colore standard SDR su ogni file prodotto (compatibilità con telefoni, browser e social)
const BT709 = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];

// Zoom con il filtro perspective: risoluzione costante e precisione sub-pixel (niente scatti, niente crash).
// perspective non conosce il tempo t: si usa il numero del fotogramma (in / fps).
function zoomFilter(Z) {
  const X = (e) => `W/2+(${e}-W/2)/${Z}`;
  const Y = (e) => `H/2+(${e}-H/2)/${Z}`;
  return `perspective=x0='${X(0)}':y0='${Y(0)}':x1='${X('W')}':y1='${Y(0)}':x2='${X(0)}':y2='${Y('H')}':x3='${X('W')}':y3='${Y('H')}':interpolation=cubic:eval=frame`;
}

// HDR (HLG/PQ dell'iPhone) -> SDR bt709 con tone mapping; per gli altri solo i tag colore standard
export function toSdr(info) {
  const tm = info.hdr
    ? 'zscale=t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,'
    : '';
  return `${tm}setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv`;
}

// ease: 'lineare' oppure 'morbido' (parte e arriva piano: smoothstep)
function zoomExpr(zoom, amt, dur, fps, ease = 'lineare') {
  const t = `(in/${fps})`, d = n3(dur), A = n3(amt);
  const p = ease === 'morbido' ? `(3*pow(clip(${t}/${d},0,1),2)-2*pow(clip(${t}/${d},0,1),3))` : `clip(${t}/${d},0,1)`;
  switch (zoom) {
    case 'push': return `(1+${A}*${p})`;
    case 'pull': return `(1+${A}*(1-${p}))`;
    case 'punch': return `(1+${A}*exp(-${t}*${ease === 'morbido' ? 4 : 8})+0.03*${t}/${d})`;
    case 'hold': return `(${n3(1 + amt)}+0.025*${t}/${d})`;
    default: return null;
  }
}

function videoChain({ info, W, H, dur, cx0, cx1, zoom, zoomAmt, ease, reframe, preset, fps }) {
  const sw = info.width, sh = info.height;
  const a = W / H;
  let head = `[0:v]fps=${fps},setpts=PTS-STARTPTS,${toSdr(info)},`;
  const parts = [];
  if (reframe === 'blur' && Math.abs(sw / sh - a) > 0.05) {
    // video intero al centro, sfondo sfocato dello stesso video
    head += `split[bgi][fgi];[bgi]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=24:2,eq=brightness=-0.1:saturation=0.8[bgo];` +
      `[fgi]scale=${W}:${H}:force_original_aspect_ratio=decrease[fgo];[bgo][fgo]overlay=(W-w)/2:(H-h)/2,`;
  } else {
    if (sw / sh > a) {
      // ritaglio che segue il movimento (panoramica lenta da cx0 a cx1)
      const cw = Math.min(sw, even(sh * a));
      const x0 = Math.max(0, Math.min(sw - cw, cx0 * sw - cw / 2));
      const x1 = Math.max(0, Math.min(sw - cw, cx1 * sw - cw / 2));
      parts.push(`crop=${cw}:${sh}:x='${n3(x0)}+${n3(x1 - x0)}*min(1,t/${n3(dur)})':y=0`);
    } else if (sw / sh < a) {
      const ch = Math.min(sh, even(sw / a));
      parts.push(`crop=${sw}:${ch}:0:${Math.round((sh - ch) * 0.4)}`);
    }
    parts.push(`scale=${W}:${H}:flags=bicubic`);
  }
  const z = zoomExpr(zoom, zoomAmt, dur, fps, ease);
  if (z) parts.push(zoomFilter(z));
  if (preset.grade) parts.push(preset.grade);
  if (preset.vignette) parts.push('vignette=angle=PI/5.5');
  parts.push('setsar=1', 'format=yuv420p', 'tpad=stop_mode=clone:stop_duration=3');
  return `${head}${parts.join(',')}[v]`;
}

export async function renderShot({ file, info, srcStart, frames, fps, W, H, shot, preset, reframe, audio, out, workDir }) {
  const dur = frames / fps;
  const args = ['-ss', n3(Math.max(0, srcStart)), '-t', n3(dur + 1.5), '-i', file];
  let fc = videoChain({ info, W, H, dur, cx0: shot.cx0, cx1: shot.cx1, zoom: shot.zoom, zoomAmt: shot.zoomAmt, ease: shot.ease, reframe, preset, fps });
  if (audio) {
    args.push('-ss', n3(audio.start), '-t', n3(dur + 0.5), '-i', audio.file);
    const fi = audio.fadeIn ? `,afade=t=in:d=0.015` : '';
    const fo = audio.fadeOut ? `,afade=t=out:st=${n3(dur - 0.02)}:d=0.02` : '';
    fc += `;[1:a]aresample=48000,aformat=channel_layouts=stereo,atrim=end=${n3(dur)},apad=whole_dur=${n3(dur)}${fi}${fo}[a]`;
  }
  args.push('-filter_complex', fc, '-map', '[v]');
  if (audio) args.push('-map', '[a]', '-c:a', 'pcm_s16le');
  else args.push('-an');
  args.push('-frames:v', String(frames), ...BT709, '-c:v', 'libx264', ...encMid(), '-r', String(fps), out);
  await ffmpeg(args, { cwd: workDir });
}

// Unisce le inquadrature: taglio netto (concat) o transizione (xfade), mantenendo i tagli esattamente sui beat.
export async function assembleBody({ shots, files, fps, withAudio, out, workDir, onProgress }) {
  const args = [];
  files.forEach((f) => args.push('-i', f));
  const fc = [];
  shots.forEach((_, i) => fc.push(`[${i}:v]settb=AVTB,setpts=PTS-STARTPTS,fps=${fps}[s${i}]`));
  let cur = 's0';
  let acc = shots[0].frames;
  for (let i = 1; i < shots.length; i++) {
    const t = shots[i - 1].transOut;
    const lbl = `m${i}`;
    if (t && t.frames > 0) {
      const off = (acc - t.frames) / fps;
      fc.push(`[${cur}][s${i}]xfade=transition=${XFADE[t.type] || 'fade'}:duration=${n3(t.frames / fps)}:offset=${n3(off)},fps=${fps}[${lbl}]`);
      acc += shots[i].frames - t.frames;
    } else {
      // fps esplicito: con ffmpeg 7 dopo concat il frame rate risulta "variabile" e xfade rifiuta l'ingresso
      fc.push(`[${cur}][s${i}]concat=n=2:v=1:a=0,fps=${fps}[${lbl}]`);
      acc += shots[i].frames;
    }
    cur = lbl;
  }
  fc.push(`[${cur}]null[v]`);
  if (withAudio) {
    fc.push(shots.map((_, i) => `[${i}:a]`).join('') + `concat=n=${shots.length}:v=0:a=1[a]`);
  }
  args.push('-filter_complex', fc.join(';'), '-map', '[v]');
  if (withAudio) args.push('-map', '[a]', '-c:a', 'pcm_s16le');
  args.push('-frames:v', String(acc), ...BT709, '-c:v', 'libx264', ...encMid(), '-r', String(fps), out);
  await ffmpeg(args, { cwd: workDir, duration: acc / fps, onProgress });
  return acc;
}

// Schermata finale: sfondo sfocato dall'ultima inquadratura con lento zoom + logo che entra dal basso in dissolvenza.
// Con `still` produce solo un'immagine (fotogramma finale, testi compresi) per l'anteprima nell'editor.
export async function renderEndscreen({ bgFrame, logo, W, H, dur, fps, out, workDir, still = null, ass = null }) {
  if (still) {
    const fc0 = await endscreenGraph({ bgFrame, logo, W, H, dur, fps });
    const fc = fc0.fc.replace(/\[v\]$/, `,${ass ? `ass=filename=${ass}:fontsdir=fonts,` : ''}select='gte(n\\,${Math.round(dur * fps) - 3})'[v]`);
    await ffmpeg([...fc0.args, '-filter_complex', fc, '-map', '[v]', '-frames:v', '1', '-q:v', '3', still], { cwd: workDir });
    return still;
  }
  const { args, fc, frames } = await endscreenGraph({ bgFrame, logo, W, H, dur, fps });
  args.push('-filter_complex', fc, '-map', '[v]', '-frames:v', String(frames), ...BT709, '-c:v', 'libx264', ...encMid(), '-r', String(fps), out);
  await ffmpeg(args, { cwd: workDir });
  return frames;
}

async function endscreenGraph({ bgFrame, logo, W, H, dur, fps }) {
  const frames = Math.round(dur * fps);
  const args = ['-loop', '1', '-framerate', String(fps), '-t', n3(dur), '-i', bgFrame];
  let fc = `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=30:3,eq=brightness=-0.25:saturation=0.75,` +
    `${zoomFilter(`(1.04+0.07*(in/${fps})/${n3(dur)})`)},setsar=1[bg]`;
  if (logo) {
    const li = await probe(logo);
    const s = Math.min((W * 0.72) / li.width, (H * 0.22) / li.height);
    const LW = even(li.width * s), LH = even(li.height * s);
    const yc = Math.round(H * 0.36);
    // ingresso: dissolvenza + risalita di 70px con rallentamento finale (ease-out cubico)
    args.push('-loop', '1', '-framerate', String(fps), '-t', n3(dur), '-i', logo);
    fc += `;[1:v]format=rgba,scale=${LW}:${LH}:flags=lanczos,fade=t=in:st=0.2:d=0.6:alpha=1[lg];` +
      `[bg][lg]overlay=x=(W-w)/2:y='${yc}-h/2+70*pow(1-clip((t-0.2)/0.7,0,1),3)':format=auto,format=yuv420p[v]`;
  } else {
    fc += ';[bg]format=yuv420p[v]';
  }
  return { args, fc, frames };
}

export async function grabFrame(video, out, { fromEnd = false, at = 0, workDir } = {}) {
  const pos = fromEnd ? ['-sseof', '-0.2'] : ['-ss', n3(at)];
  await ffmpeg([...pos, '-i', video, '-frames:v', '1', '-q:v', '2', out], { cwd: workDir });
}

// Logo identificativo sopra i primi ~2 secondi di ogni reel ("spot" iniziale): il video parte subito
// (nessuno spettatore perso), il logo entra in dissolvenza scendendo appena, con un'ombra morbida
// che lo rende leggibile anche su riprese chiare, poi sparisce.
const INTRO_DUR = 2.3;
async function introGraph({ logo, idx, W, H, fps }) {
  const li = await probe(logo);
  const LW = even(Math.min(W * 0.66, (H * 0.13 * li.width) / li.height));
  const LH = even((li.height * LW) / li.width);
  const m = even(LW * 0.08); // margine per l'ombra sfocata
  const y0 = Math.round(H * (H > W ? 0.085 : 0.07)) - m;
  const d = n3(INTRO_DUR);
  return [
    `[${idx}:v]format=rgba,scale=${LW}:${LH}:flags=lanczos,pad=${LW + 2 * m}:${LH + 2 * m}:${m}:${m}:color=0x00000000,split[lgA][lgB]`,
    `[lgB]colorchannelmixer=rr=0:gg=0:bb=0:aa=0.85,boxblur=${Math.max(4, Math.round(m / 2))}:2[lgS]`,
    `[lgS][lgA]overlay=0:0:format=auto,fade=t=in:st=0.12:d=0.4:alpha=1,fade=t=out:st=${n3(INTRO_DUR - 0.45)}:d=0.4:alpha=1[lgF]`,
    `[vi][lgF]overlay=x=(W-w)/2:y='${y0}-${Math.round(H * 0.012)}*pow(1-clip((t-0.12)/0.55,0,1),3)':eval=frame:eof_action=pass:enable='lt(t,${d})':format=auto[vx]`,
  ];
}

// Passata finale: dissolvenza verso la schermata finale, logo iniziale, testi/sottotitoli (ASS), audio normalizzato per i social.
export async function renderFinal({ body, bodyFrames, end, endFrames, ass, fps, audio, out, workDir, onProgress, intro = null }) {
  const XF = end ? Math.round(0.5 * fps) : 0;
  const total = end ? bodyFrames + endFrames - XF : bodyFrames;
  const T = total / fps;
  const bodyT = bodyFrames / fps;
  const args = ['-i', body];
  if (end) args.push('-i', end);
  const fc = [];
  const bodyLabel = intro ? 'vi' : 'vx';
  if (end) fc.push(`[0:v][1:v]xfade=transition=fade:duration=${n3(XF / fps)}:offset=${n3((bodyFrames - XF) / fps)}[${bodyLabel}]`);
  else fc.push(`[0:v]null[${bodyLabel}]`);
  // indici degli ingressi: 0 corpo, (1 finale), poi l'audio (musica o base sotto il parlato), poi il logo
  const musicIdx = end ? 2 : 1;
  const hasAudioInput = audio.type === 'music' || !!audio.bed;
  if (intro?.logo) {
    fc.push(...(await introGraph({ logo: intro.logo, idx: musicIdx + (hasAudioInput ? 1 : 0), W: intro.W, H: intro.H, fps })));
  } else if (intro) {
    fc.push('[vi]null[vx]');
  }
  fc.push(ass ? `[vx]ass=filename=${ass}:fontsdir=fonts,format=yuv420p[v]` : '[vx]format=yuv420p[v]');

  const fadeOut = Math.min(2.5, T * 0.2);
  if (audio.type === 'music') {
    args.push('-ss', n3(audio.start), '-t', n3(T + 0.5), '-i', audio.file);
    fc.push(`[${musicIdx}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=end=${n3(T)},apad=whole_dur=${n3(T)},` +
      `afade=t=in:d=0.05,afade=t=out:st=${n3(T - fadeOut)}:d=${n3(fadeOut)},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]`);
  } else {
    const speech = `[0:a]aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=${n3(T)},loudnorm=I=-14:TP=-1.5:LRA=9,aresample=48000`;
    if (audio.bed) {
      // musica di sottofondo bassa sotto il parlato, sale sulla schermata finale
      args.push('-stream_loop', '-1', '-i', audio.bed);
      fc.push(`${speech}[sp]`);
      fc.push(`[${musicIdx}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=end=${n3(T)},` +
        `volume='0.10+0.45*clip((t-${n3(bodyT - 0.5)})/1.0,0,1)':eval=frame,afade=t=out:st=${n3(T - fadeOut)}:d=${n3(fadeOut)}[bed]`);
      fc.push('[sp][bed]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.9[a]');
    } else {
      fc.push(`${speech},afade=t=out:st=${n3(T - 0.4)}:d=0.4[a]`);
    }
  }
  if (intro?.logo) args.push('-loop', '1', '-framerate', String(fps), '-t', n3(INTRO_DUR), '-i', intro.logo);
  args.push('-filter_complex', fc.join(';'), '-map', '[v]', '-map', '[a]',
    '-frames:v', String(total), ...BT709, '-c:v', 'libx264', ...encFinal(), '-profile:v', 'high', '-level', '4.1',
    '-pix_fmt', 'yuv420p', '-r', String(fps), '-g', String(fps * 2),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out);
  await ffmpeg(args, { cwd: workDir, duration: T, onProgress });
  return T;
}
