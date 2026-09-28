// Trascrizione locale con Whisper (nessun dato esce dal PC). Il modello (~250 MB) si scarica la prima volta.
import path from 'node:path';
import { pcm } from './ffmpeg.js';

const MODEL = 'onnx-community/whisper-small_timestamped';
let asr = null;

export async function transcribe(file, { root, language = 'italian', log, start, dur } = {}) {
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = path.join(root, 'models');
  if (!asr) {
    log?.('Carico il modello di trascrizione (la prima volta lo scarica, ~250 MB)...');
    asr = await pipeline('automatic-speech-recognition', MODEL, { dtype: 'q8' });
  }
  const audio = await pcm(file, 16000, { start, dur });
  const out = await asr(audio, { language, task: 'transcribe', return_timestamps: 'word', chunk_length_s: 30, stride_length_s: 5 });
  return (out.chunks || [])
    .map((c) => ({ text: c.text.trim(), start: c.timestamp[0], end: c.timestamp[1] ?? c.timestamp[0] + 0.3 }))
    .filter((w) => w.text && Number.isFinite(w.start));
}
