// Wrapper minimi attorno a ffmpeg / ffprobe (binari scaricati da npm, nessuna installazione di sistema).
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

export const FFMPEG = ffmpegPath;
export const FFPROBE = ffprobeStatic.path;

export function run(bin, args, { cwd, onProgress, duration } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { cwd, windowsHide: true });
    const out = [];
    let err = '';
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => {
      const s = d.toString();
      err += s;
      if (err.length > 400000) err = err.slice(-100000);
      if (onProgress && duration) {
        const m = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(s);
        if (m) onProgress(Math.min(1, (+m[1] * 3600 + +m[2] * 60 + +m[3]) / duration));
      }
    });
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve({ stdout: Buffer.concat(out), stderr: err });
      else {
        const e = new Error(`ffmpeg ha restituito errore ${code}:\n${err.slice(-1500)}`);
        e.args = args;
        reject(e);
      }
    });
  });
}

export const ffmpeg = (args, opts) => run(FFMPEG, ['-hide_banner', '-nostdin', '-y', ...args], opts);

export async function probe(file) {
  const { stdout } = await run(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
  const j = JSON.parse(stdout.toString());
  const v = (j.streams || []).find((s) => s.codec_type === 'video' && !s.disposition?.attached_pic);
  const a = (j.streams || []).find((s) => s.codec_type === 'audio');
  const duration = parseFloat(j.format?.duration || v?.duration || a?.duration || 0);
  let width = v?.width || 0;
  let height = v?.height || 0;
  if (v) {
    let rot = parseInt(v.tags?.rotate || 0, 10);
    const sd = (v.side_data_list || []).find((s) => s.rotation !== undefined);
    if (sd) rot = sd.rotation;
    if (Math.abs(rot) % 180 === 90) [width, height] = [height, width];
  }
  const fr = (v?.avg_frame_rate && v.avg_frame_rate !== '0/0' ? v.avg_frame_rate : v?.r_frame_rate) || '30/1';
  const [n, d] = fr.split('/').map(Number);
  const fps = d ? n / d : n;
  const creation = j.format?.tags?.creation_time || v?.tags?.creation_time || null;
  // HDR (iPhone HLG / HDR10): va convertito in SDR, altrimenti colori spenti e file che i lettori non riproducono bene
  const hdr = ['arib-std-b67', 'smpte2084'].includes(v?.color_transfer);
  return { file, duration, width, height, fps: fps || 30, hasVideo: !!v, hasAudio: !!a, creation, hdr, transfer: v?.color_transfer || null };
}

// Audio mono float32 a `rate` Hz.
export async function pcm(file, rate, { start, dur } = {}) {
  const args = [];
  if (start) args.push('-ss', start.toFixed(3));
  if (dur) args.push('-t', dur.toFixed(3));
  args.push('-i', file, '-vn', '-ac', '1', '-ar', String(rate), '-f', 's16le', '-');
  const { stdout } = await ffmpeg(args);
  const n = stdout.length >> 1;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = stdout.readInt16LE(i * 2) / 32768;
  return out;
}

// Fotogrammi in scala di grigi a bassa risoluzione per l'analisi.
export async function grayFrames(file, w, h, fps, opts) {
  const vf = ['-an', '-vf', `fps=${fps},scale=${w}:${h}:flags=area,format=gray`, '-f', 'rawvideo', '-'];
  let r;
  try { r = await ffmpeg(['-hwaccel', 'auto', '-i', file, ...vf], opts); }
  catch { r = await ffmpeg(['-i', file, ...vf], opts); } // ripiego senza accelerazione hardware
  return { data: r.stdout, n: Math.floor(r.stdout.length / (w * h)) };
}
