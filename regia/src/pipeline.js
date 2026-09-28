// Il regista: dal percorso dei file al video finito, in automatico.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { probe, pcm, ffmpeg } from './ffmpeg.js';
import { analyzeClip, WIN } from './analyze.js';
import { onsetEnvelope, detectBeats, makeSyncer, percentile } from './dsp.js';
import { scoreClips, chooseMusicWindow, planHighlight, speechRegions, windowStats, framing, momentPool, computeHighlightFrames } from './plan.js';
import { renderShot, assembleBody, renderEndscreen, renderFinal, grabFrame, toSdr, setDraft } from './render.js';
import { buildAss } from './subs.js';
import { transcribeClips, buildSpeechShots } from './speech.js';
import { PRESETS, FORMATS, LOOKS, DEFAULT_LOOK } from './presets.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v', '.mkv', '.avi', '.mts', '.m2ts', '.3gp', '.webm', '.wmv']);
const AUDIO_EXT = new Set(['.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg', '.wma', '.aif', '.aiff']);
const FPS = 30;

const DEFAULT_CONFIG = {
  // Brand ricavato da www.fortedj.it (testi, contatti, colori e font del sito)
  brand: {
    nome: 'Forte DJ', payoff: 'DJ • WEDDING • EVENTS', zona: 'Alessandria · Genova · Basso Piemonte',
    instagram: '@forte_dj', telefono: '+39 366 744 7280', sito: 'www.fortedj.it', email: 'info.andreaforte@gmail.com',
    contatti: ['instagram', 'telefono', 'sito'],
    logo: 'ASSETS/logo.png', colore: '#C9A876', coloreTesto: '#F6F1E7',
    font: 'Playfair Display', fontTesti: 'Inter', mostraNomeConLogo: false,
    slogans: {
      festa: 'Non è solo musica. È quel momento in cui tutti iniziano a ballare.',
      matrimonio: 'Il tuo matrimonio. La sua colonna sonora.',
      evento: 'Ogni evento ha la sua musica.',
    },
    ctas: { festa: 'Preventivo veloce, senza impegno', matrimonio: 'Scrivimi per la tua data', evento: 'Preventivo veloce, senza impegno' },
    // proposte selezionabili nella pagina (tratte dai contenuti del sito)
    sloganProposti: [
      'La musica che trasforma un momento in un ricordo.',
      'Non è solo musica. È quel momento in cui tutti iniziano a ballare.',
      'Il tuo matrimonio. La sua colonna sonora.',
      'Ogni evento ha la sua musica.',
      'Dal primo brano all\'ultimo, la pista sempre piena.',
      'That Moment.',
    ],
    invitiProposti: [
      'Preventivo veloce, senza impegno',
      'Scrivimi per la tua data',
      'Blocca la tua data',
      'Vivi l\'esperienza Forte DJ',
      '5.0 ★ · 78 recensioni verificate',
      'Piemonte · Liguria · Lombardia',
    ],
    titoliProposti: ['That Moment.', 'First Dance', 'Final Dance', 'Wedding Party', 'Party Night', 'Il nostro sì'],
  },
  finale: { attivo: true, durata: 3.5 },
  predefiniti: { preset: 'festa', mode: 'auto', durata: 30, formati: ['9x16', '4x5'], reframe: 'crop', sottotitoli: true, musica: 'auto' },
  // Autopilota: sorveglia la cartella, monta e pubblica da solo. Ritmo preso dal sistema agenti Forte DJ (2-3 reel/settimana, Lun-Sab).
  auto: {
    attivo: false, pubblica: true,
    cartella: 'C:\\Users\\forte\\Desktop\\DJ SOCIAL-1-001\\DJ SOCIAL',
    agenti: 'C:\\Users\\forte\\.gemini\\antigravity-ide\\scratch\\forte-dj',
    stile: 'festa', durata: 30, formati: ['9x16'], staccoOre: 4,
    slot: [{ giorno: 'Mar', ora: '19:30' }, { giorno: 'Gio', ora: '19:30' }, { giorno: 'Sab', ora: '18:30' }],
  },
  // Collegamento Meta (compilato dalla pagina: il token resta solo su questo PC)
  social: { pageId: '', pageNome: '', pageToken: '', igId: '', igUsername: '', instagram: true, facebook: true },
};

export function loadConfig() {
  const f = path.join(ROOT, 'config.json');
  let c = {};
  try { c = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* default */ }
  return {
    brand: { ...DEFAULT_CONFIG.brand, ...c.brand },
    finale: { ...DEFAULT_CONFIG.finale, ...c.finale },
    predefiniti: { ...DEFAULT_CONFIG.predefiniti, ...c.predefiniti },
    auto: { ...DEFAULT_CONFIG.auto, ...c.auto },
    social: { ...DEFAULT_CONFIG.social, ...c.social },
  };
}
export function saveConfig(cfg) {
  fs.writeFileSync(path.join(ROOT, 'config.json'), JSON.stringify(cfg, null, 2));
}
export function listMusic() {
  const d = path.join(ROOT, 'ASSETS', 'musica');
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => AUDIO_EXT.has(path.extname(f).toLowerCase())).sort();
}

function collectInputs(input, depth = 0) {
  if (!fs.existsSync(input)) throw new Error(`Percorso non trovato: ${input}`);
  const st = fs.statSync(input);
  if (st.isFile()) return [input];
  const out = [];
  for (const f of fs.readdirSync(input).sort()) {
    if (f.startsWith('.') || f.startsWith('~')) continue;
    const p = path.join(input, f);
    const s = fs.statSync(p);
    if (s.isDirectory() && depth < 2) out.push(...collectInputs(p, depth + 1));
    else if (s.isFile() && (VIDEO_EXT.has(path.extname(f).toLowerCase()) || AUDIO_EXT.has(path.extname(f).toLowerCase()))) out.push(p);
  }
  return out;
}

const slug = (s) => String(s || 'video').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'video';
const stamp = () => {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
};

// Didascalia pronta per Instagram/Facebook, con i toni e le parole del sito.
function postCaption(b, presetKey, job) {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const aperture = {
    festa: ['Quando parte il pezzo giusto, nessuno resta seduto. 🔥', 'Non è solo musica: è quel momento in cui tutti iniziano a ballare.', 'Pista piena dal primo all\'ultimo brano. 🎧'],
    matrimonio: ['Il vostro matrimonio. La sua colonna sonora. 🤍', 'Dalla cerimonia al final dance, ogni momento ha la sua musica.', 'La musica che trasforma un momento in un ricordo. ✨'],
    evento: ['Ogni evento ha la sua musica. 🎶', 'Musica calibrata sull\'identità del brand, dall\'aperitivo al party.', 'Atmosfera, persone e musica: un\'unica esperienza.'],
  }[presetKey] || ['La musica che trasforma un momento in un ricordo.'];
  const tags = {
    festa: '#fortedj #djset #party #festa #diciottesimo #compleanno #dancefloor #djpiemonte #djtorino',
    matrimonio: '#fortedj #djmatrimonio #wedding #weddingdj #matrimonio #firstdance #sposi2027 #matrimonioinpiemonte #weddingparty',
    evento: '#fortedj #eventiaziendali #corporateevent #djeventi #aperitivo #eventi #djpiemonte #djmilano',
  }[presetKey] || '#fortedj';
  return [
    job.titolo || null,
    pick(aperture),
    '',
    `⭐ 5.0/5 su 78 recensioni verificate`,
    `📍 ${b.zona || 'Alessandria · Genova · Basso Piemonte'}`,
    `📩 ${job.cta || b.ctas?.[presetKey] || 'Preventivo veloce, senza impegno'}: scrivimi in DM o su WhatsApp ${b.telefono}`,
    `🌐 ${b.sito}`,
    '',
    tags,
  ].filter((l) => l !== null).join('\n') + '\n';
}

async function beatConfidence(file, dur) {
  const len = Math.min(40, dur);
  const x = await pcm(file, 22050, { start: Math.max(0, dur / 2 - len / 2), dur: len });
  return detectBeats(onsetEnvelope(x, 22050)).confidence;
}

// =====================================================================
// PROGETTI: fase 1 "prepara" (automatica) → editor → fase 2 "renderizza"
// =====================================================================
export const PROJ = path.join(ROOT, 'PROGETTI');
export const projectDir = (id) => path.join(PROJ, id);
export function loadProject(id) {
  if (!/^[\w.-]+$/.test(id)) throw new Error('Progetto non valido');
  return JSON.parse(fs.readFileSync(path.join(projectDir(id), 'progetto.json'), 'utf8'));
}
export function saveProject(p) {
  p.modificato = new Date().toISOString();
  fs.writeFileSync(path.join(projectDir(p.id), 'progetto.json'), JSON.stringify(p));
}
export function listProjects() {
  if (!fs.existsSync(PROJ)) return [];
  return fs.readdirSync(PROJ).sort().reverse().slice(0, 40).flatMap((id) => {
    try {
      const p = loadProject(id);
      return [{ id, titolo: p.settings.titolo || p.clips[0]?.name, modo: p.mode, stile: p.settings.preset, creato: p.creato, modificato: p.modificato, esportato: p.esportato || null }];
    } catch { return []; }
  });
}

function settingsFrom(job, cfg) {
  const d = cfg.predefiniti;
  const preset = PRESETS[job.preset] ? job.preset : d.preset;
  return {
    preset, mode: job.mode || d.mode, durata: Number(job.durata || d.durata) || 30,
    formati: (job.formati?.length ? job.formati : d.formati).filter((f) => FORMATS[f]),
    reframe: job.reframe || d.reframe, sottotitoli: job.sottotitoli ?? d.sottotitoli,
    finale: job.finale !== false && cfg.finale.attivo !== false, musica: job.musica || d.musica || 'auto',
    titolo: job.titolo || '', nome: job.nome || '', slogan: job.slogan, cta: job.cta,
    look: LOOKS[job.look] ? job.look : DEFAULT_LOOK[preset] || 'naturale',
    inizioMusica: job.inizioMusica, musicaSottoParlato: !!job.musicaSottoParlato,
  };
}

export const copyFonts = (dir) => {
  fs.mkdirSync(path.join(dir, 'fonts'), { recursive: true });
  for (const f of ['C:\\Windows\\Fonts\\seguibl.ttf', 'C:\\Windows\\Fonts\\segoeui.ttf']) if (fs.existsSync(f)) fs.copyFileSync(f, path.join(dir, 'fonts', path.basename(f)));
  const fontDir = path.join(ROOT, 'ASSETS', 'font');
  if (fs.existsSync(fontDir)) for (const f of fs.readdirSync(fontDir)) if (/\.(ttf|otf)$/i.test(f)) fs.copyFileSync(path.join(fontDir, f), path.join(dir, 'fonts', f));
};
export const brandLogo = (cfg) => {
  const p = cfg.brand.logo ? path.resolve(ROOT, cfg.brand.logo) : null;
  return p && fs.existsSync(p) ? p : null;
};
export function endTexts(cfg, s, start, dur) {
  const b = cfg.brand;
  const contactText = { instagram: b.instagram && `Instagram  ${b.instagram}`, telefono: b.telefono && `WhatsApp  ${b.telefono}`, sito: b.sito, email: b.email };
  return {
    start, dur, nome: b.nome, mostraNome: b.mostraNomeConLogo,
    slogan: s.slogan ?? b.slogans?.[s.preset] ?? '', cta: s.cta ?? b.ctas?.[s.preset] ?? '',
    contatti: (b.contatti || ['instagram', 'telefono', 'sito']).map((k) => contactText[k]),
  };
}
export const assFor = (cfg, s, extra) => buildAss({
  fonts: { display: cfg.brand.font, testi: cfg.brand.fontTesti || cfg.brand.font },
  colors: { accento: cfg.brand.colore, testo: cfg.brand.coloreTesto || '#FFFFFF' },
  title: s.titolo, ...extra,
});

async function loadClips(project, cacheDir) {
  const clips = [];
  for (const pc of project.clips) {
    const an = await analyzeClip(pc.info, { cacheDir });
    clips.push({ ...pc, an, order: pc.id });
  }
  scoreClips(clips, PRESETS[project.settings.preset] || PRESETS.festa);
  return clips;
}

// Anteprima della schermata finale (immagine), rigenerata quando cambi slogan/invito/logo.
export async function makeEndPreview(project) {
  const cfg = loadConfig();
  const dir = projectDir(project.id);
  copyFonts(dir);
  const W = 540, H = 960, dur = Number(cfg.finale.durata) || 3.5;
  const ass = assFor(cfg, project.settings, { W, H, bodyT: 0, words: null, hasLogo: !!brandLogo(cfg), end: endTexts(cfg, project.settings, 0, dur) })
    .replace(/Dialogue: 2,.*\n/g, ''); // niente titolo iniziale
  fs.writeFileSync(path.join(dir, 'finale.ass'), ass, 'utf8');
  await renderEndscreen({ bgFrame: path.join(dir, 'sfondo.jpg'), logo: brandLogo(cfg), W, H, dur, fps: FPS, workDir: dir, still: path.join(dir, 'finale.jpg'), ass: 'finale.ass' });
  return 'finale.jpg';
}

async function makeProxy(info, out) {
  await ffmpeg(['-i', info.file, '-vf', `fps=30,${toSdr(info)},scale='if(gt(iw,ih),-2,540)':'if(gt(iw,ih),540,-2)',format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-g', '15', '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-movflags', '+faststart', out]);
}

export async function prepareProject(job, { emit = () => {}, scale = (p) => p } = {}) {
  const log = (msg) => emit({ type: 'log', msg });
  const progress = (pct, stage) => emit({ type: 'progress', pct: Math.round(Math.min(100, scale(pct)) * 10) / 10, stage });
  const cfg = loadConfig();
  const S = settingsFrom(job, cfg);
  const preset = PRESETS[S.preset];
  if (!S.formati.length) throw new Error('Nessun formato valido selezionato');

  // ---------- 1. file ----------
  progress(1, 'Cerco i file');
  const input = (job.input || '').trim().replace(/^"|"$/g, '') || path.join(ROOT, 'INPUT');
  // più percorsi separati da ";" oppure uno per riga
  const files = input.split(/[;\r\n]+/).map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean).flatMap((p) => collectInputs(p));
  const infos = [];
  for (const f of files) {
    try { infos.push(await probe(f)); } catch { log(`File ignorato (non leggibile): ${path.basename(f)}`); }
  }
  const videos = infos.filter((i) => i.hasVideo && i.duration > 0.5 && VIDEO_EXT.has(path.extname(i.file).toLowerCase()));
  const audios = infos.filter((i) => !i.hasVideo && i.hasAudio && i.duration > 1);
  if (!videos.length) throw new Error(`Nessun video trovato in: ${input}`);
  videos.sort((a, b) => (a.creation && b.creation ? Date.parse(a.creation) - Date.parse(b.creation) : 0) || a.file.localeCompare(b.file));
  log(`Trovati ${videos.length} video${audios.length ? ` e ${audios.length} file audio` : ''} (${(videos.reduce((s, v) => s + v.duration, 0) / 60).toFixed(1)} minuti di girato)`);

  // ---------- 2. analisi ----------
  const cacheDir = path.join(ROOT, '.cache');
  const clips = [];
  for (let i = 0; i < videos.length; i++) {
    const info = videos[i];
    log(`Analizzo ${path.basename(info.file)} (${info.width}x${info.height}${info.hdr ? ' HDR' : ''}, ${info.duration.toFixed(1)}s)`);
    const an = await analyzeClip(info, { cacheDir, onProgress: (p) => progress(2 + (38 * (i + p)) / videos.length, 'Analisi del girato') });
    clips.push({ id: i, order: i, info, an, name: path.basename(info.file), offset: null });
  }
  scoreClips(clips, preset);
  for (const c of clips) {
    const dead = c.dead.filter(Boolean).length / (c.dead.length || 1);
    if (dead > 0.05) log(`  ${c.name}: ${(dead * 100).toFixed(0)}% tempi morti scartati (buio, mosso, sfocato o fermo)`);
  }

  // ---------- 3. modalità + sorgente audio ----------
  progress(41, 'Ascolto l\'audio');
  const musicChoice = S.musica;
  let musicFile = null, isEvent = false, masterClip = null;
  if (musicChoice && !['auto', 'evento'].includes(musicChoice)) {
    const cand = [musicChoice, path.join(ROOT, 'ASSETS', 'musica', musicChoice)].find((p) => fs.existsSync(p));
    if (!cand) throw new Error(`Musica non trovata: ${musicChoice}`);
    musicFile = cand;
  } else if (audios.length) {
    musicFile = audios.sort((a, b) => b.duration - a.duration)[0].file;
    isEvent = true;
    log(`Audio esterno rilevato: ${path.basename(musicFile)} (lo sincronizzo con i video)`);
  }
  const withAudio = clips.filter((c) => c.an.audio);
  const longest = [...withAudio].sort((a, b) => b.info.duration - a.info.duration)[0];

  let mode = S.mode;
  if (mode === 'auto') {
    const probeFile = isEvent ? musicFile : musicFile ? null : longest?.info.file;
    if (!probeFile) mode = 'highlight';
    else {
      const dur = isEvent ? audios[0].duration : longest.info.duration;
      const conf = await beatConfidence(probeFile, dur);
      const an = isEvent ? null : longest.an.audio;
      const cov = an ? speechRegions(an.rms, an.rmsRate).reduce((s, [a, b]) => s + b - a, 0) / longest.info.duration : 0;
      mode = conf >= 0.5 ? 'highlight' : cov > 0.4 ? 'speech' : 'highlight';
      log(`Riconoscimento automatico: ritmo ${conf.toFixed(1)}, parlato ${(cov * 100).toFixed(0)}% → ${mode === 'speech' ? 'PARLATO (taglio pause + sottotitoli)' : 'MONTAGGIO MUSICALE'}`);
    }
  }

  let music = null;
  if (mode === 'highlight') {
    if (!musicFile) {
      const conf = longest ? await beatConfidence(longest.info.file, longest.info.duration) : 0;
      const lib = listMusic();
      if (longest && (conf >= 0.5 || !lib.length || musicChoice === 'evento')) {
        musicFile = longest.info.file; isEvent = true; masterClip = longest;
        log(`Uso l'audio originale dell'evento da ${longest.name}`);
      } else if (lib.length) {
        musicFile = path.join(ROOT, 'ASSETS', 'musica', lib[Math.floor(Math.random() * lib.length)]);
        log(`Musica di sottofondo: ${path.basename(musicFile)}`);
      }
    }
    if (!musicFile) throw new Error('Nessuna musica disponibile: metti un brano in ASSETS\\musica oppure usa video con audio');
    const minfo = await probe(musicFile);
    const man = masterClip ? masterClip.an : await analyzeClip(minfo, { cacheDir });
    music = { file: musicFile, info: minfo, an: man.audio, isEvent };
  } else if (isEvent) {
    const minfo = await probe(musicFile);
    music = { file: musicFile, info: minfo, an: (await analyzeClip(minfo, { cacheDir })).audio, isEvent: true };
  }

  // ---------- 4. sincronizzazione audio ----------
  if (music?.isEvent) {
    progress(43, 'Sincronizzo l\'audio');
    const rate = music.an.syncRate;
    const maxLen = Math.max(...clips.map((c) => c.an.audio?.sync[0].length || 0));
    const findIn = makeSyncer(music.an.sync, maxLen, rate);
    for (const c of clips) {
      if (c === masterClip) { c.offset = 0; continue; }
      if (!c.an.audio) continue;
      const r = findIn(c.an.audio.sync);
      // Con loop musicali ripetuti ci possono essere più punti simili: l'orario di registrazione aiuta a scegliere.
      const expected = music.info.creation && c.info.creation ? (Date.parse(c.info.creation) - Date.parse(music.info.creation)) / 1000 : null;
      let pick = r.candidates[0];
      if (expected != null && r.ratio < 1.15) {
        const near = r.candidates.filter((k) => k.score >= 0.8 * r.score).sort((a, b) => Math.abs(a.lag / rate - expected) - Math.abs(b.lag / rate - expected))[0];
        if (near) pick = near;
      }
      const agrees = expected != null && pick && Math.abs(pick.lag / rate - expected) < 120;
      if (pick && pick.score >= 0.25 && (r.ratio >= 1.08 || agrees)) {
        c.offset = pick.lag / rate;
        log(`  ${c.name}: sincronizzato a ${c.offset.toFixed(2)}s (corrispondenza ${(pick.score * 100).toFixed(0)}%)`);
      } else log(`  ${c.name}: posizione nell'audio principale incerta, usato come immagini libere`);
    }
  }

  // ---------- 5. primo montaggio (grezzo) ----------
  progress(45, 'Preparo il montaggio');
  const id = `${stamp()}_${slug(S.titolo || path.parse(videos[0].file).name)}`;
  const dir = projectDir(id);
  fs.mkdirSync(path.join(dir, 'proxy'), { recursive: true });
  const endDur = S.finale ? Number(cfg.finale.durata) || 3.5 : 0;
  const project = {
    id, versione: 2, creato: new Date().toISOString(), mode, settings: { ...S, mode }, endDur,
    clips: clips.map((c) => ({ id: c.id, name: c.name, info: c.info, offset: c.offset, proxy: `proxy/clip_${c.id}.mp4` })),
  };

  if (mode === 'highlight') {
    const ws = S.inizioMusica != null && S.inizioMusica !== '' ? Number(S.inizioMusica) : chooseMusicWindow(music, S.durata + endDur, clips);
    const from = Math.max(0, ws - 2);
    const x = await pcm(music.file, 22050, { start: from, dur: S.durata + endDur + 12 });
    const bi = detectBeats(onsetEnvelope(x, 22050));
    const shift = (a) => a.map((t) => t + from);
    const beatInfo = { ...bi, beats: shift(bi.beats), downbeats: shift(bi.downbeats) };
    log(`Musica da ${ws.toFixed(1)}s, ${bi.bpm.toFixed(0)} BPM (sicurezza ${bi.confidence.toFixed(1)})`);
    const plan = planHighlight({ clips, music, beatInfo, winStart: ws, preset, target: S.durata, log });
    const shots = plan.shots.map((s) => ({
      clipId: s.clipId, src: +(s.srcStart + s.tin).toFixed(3), slotStart: s.slotStart, slotEnd: s.slotEnd,
      zoom: s.zoom, zoomAmt: s.zoomAmt, ease: 'lineare', transOut: s.transOut ? { type: s.transOut.type, dur: s.transOut.dur } : null,
      synced: !!s.synced, cx: 'auto',
    }));
    // "da controllare": le inquadrature con il punteggio più basso (J nell'editor ci salta sopra)
    const sc = shots.map((s) => windowStats(clips[s.clipId], s.src, s.src + s.slotEnd - s.slotStart).mean);
    const thr = percentile(sc, 0.25);
    shots.forEach((s, i) => { s.check = sc[i] <= thr || sc[i] < 0.35; });
    const endT = plan.end + endDur;
    const r0 = Math.floor(plan.start * music.an.rmsRate), r1 = Math.ceil(endT * music.an.rmsRate), step = music.an.rmsRate / 25;
    const peaks = [];
    for (let i = r0; i < r1; i += step) {
      const v = Math.max(...music.an.rms.slice(Math.floor(i), Math.floor(i + step)).concat([-90]));
      peaks.push(+Math.max(0, Math.min(1, (v + 55) / 50)).toFixed(2));
    }
    project.music = {
      file: music.file, isEvent: music.isEvent, start: plan.start, end: plan.end, bpm: +(plan.bpm || 0).toFixed(1),
      beats: beatInfo.beats.filter((b) => b >= plan.start - 0.01 && b <= endT).map((b) => +(b - plan.start).toFixed(3)),
      peaks, peaksRate: 25, proxy: 'musica.m4a',
    };
    project.shots = shots;
    project.pool = momentPool(clips);
    log(`Montaggio: ${shots.length} inquadrature, ${(plan.end - plan.start).toFixed(1)}s + finale ${endDur}s, ${shots.filter((s) => s.transOut).length} transizioni, ${shots.filter((s) => s.synced).length} in sync con l'audio`);
    await ffmpeg(['-ss', plan.start.toFixed(3), '-t', (endT - plan.start + 0.5).toFixed(3), '-i', music.file, '-vn', '-c:a', 'aac', '-b:a', '160k', '-ac', '2', path.join(dir, 'musica.m4a')]);
  } else {
    progress(46, 'Trascrivo il parlato parola per parola');
    project.speech = await transcribeClips({
      clips, master: music, root: ROOT, log,
      onClip: (i) => progress(46 + (20 * i) / clips.length, 'Trascrivo il parlato parola per parola'),
    });
    const nw = project.speech.reduce((s, e) => s + e.words.length, 0);
    // Rumore di festa scambiato per parlato: con la modalità automatica si torna al montaggio musicale
    if (nw < 12 && S.mode === 'auto') {
      fs.rmSync(dir, { recursive: true, force: true });
      const e = new Error('Parlato insufficiente: passo al montaggio musicale');
      e.code = 'PARLATO_SCARSO';
      throw e;
    }
    if (!nw) throw new Error('Non ho trovato parlato nei video. Prova la modalità "Montaggio musicale".');
    const reps = new Set(project.speech.flatMap((e) => e.words.filter((w) => w.r).map((w) => `${e.clipId}:${w.f}`))).size;
    log(`Parlato: ${nw} parole trascritte, ${reps} possibili ripetizioni segnalate`);
  }

  // ---------- 6. file per l'editor: proxy leggeri, anteprime look e schermata finale ----------
  // job.leggero (es. montaggio nel cloud): nessun editor da aprire, si salta questa parte
  if (job.leggero) {
    saveProject(project);
    progress(100, 'Montaggio grezzo pronto');
    return { progetto: id, mode };
  }
  for (let i = 0; i < clips.length; i++) {
    progress(66 + (26 * i) / clips.length, 'Creo le anteprime leggere per l\'editor');
    await makeProxy(clips[i].info, path.join(dir, project.clips[i].proxy));
  }
  progress(93, 'Anteprime dei look');
  const ref = project.shots?.[0] ? { c: project.shots[0].clipId, t: project.shots[0].src + 0.5 } : { c: project.speech[0].clipId, t: project.speech[0].words[0].s + 0.5 };
  const refInfo = clips[ref.c].info;
  const cropV = refInfo.width > refInfo.height ? `crop=ih*9/16:ih,` : '';
  for (const [k, lk] of Object.entries(LOOKS)) {
    await ffmpeg(['-ss', ref.t.toFixed(2), '-i', path.join(dir, project.clips[ref.c].proxy), '-frames:v', '1',
      '-vf', `${cropV}scale=270:480,${lk.grade}${lk.vignette ? ',vignette=angle=PI/5.5' : ''}`, '-q:v', '4', path.join(dir, `look_${k}.jpg`)]);
  }
  const last = project.shots ? project.shots[project.shots.length - 1] : null;
  const bgRef = last ? { c: last.clipId, t: last.src + (last.slotEnd - last.slotStart) - 0.2 } : ref;
  await ffmpeg(['-ss', Math.max(0, bgRef.t).toFixed(2), '-i', path.join(dir, project.clips[bgRef.c].proxy), '-frames:v', '1', '-q:v', '3', path.join(dir, 'sfondo.jpg')]);
  if (endDur) await makeEndPreview(project).catch((e) => log(`Anteprima finale non disponibile: ${e.message}`));
  saveProject(project);
  progress(100, 'Montaggio grezzo pronto');
  log(`✔ Progetto pronto da rivedere nell'editor: ${id}`);
  return { progetto: id, mode };
}

// ---------- fase 2: dal progetto (come l'hai lasciato nell'editor) ai video finiti ----------
// anteprima=true: versione leggera 540p identica al finale (stessi effetti), salvata nel progetto per l'editor
export async function renderProject(id, { emit = () => {}, scale = (p) => p, anteprima = false } = {}) {
  setDraft(anteprima);
  try { return await renderProjectInner(id, { emit, scale, anteprima }); } finally { setDraft(false); }
}

async function renderProjectInner(id, { emit, scale, anteprima }) {
  const t0 = Date.now();
  const log = (msg) => emit({ type: 'log', msg });
  const progress = (pct, stage) => emit({ type: 'progress', pct: Math.round(Math.min(100, scale(pct)) * 10) / 10, stage });
  const cfg = loadConfig();
  const project = loadProject(id);
  const S = project.settings;
  const mode = project.mode;
  const cacheDir = path.join(ROOT, '.cache');
  progress(1, 'Carico il progetto');
  const clips = await loadClips(project, cacheDir);
  const look = LOOKS[S.look] || LOOKS.naturale;
  const reframe = S.reframe;
  const CX = { sinistra: 0.3, centro: 0.5, destra: 0.7 };

  let shots, words = null, bodyAudio = null;
  if (mode === 'highlight') {
    shots = JSON.parse(JSON.stringify(project.shots));
    computeHighlightFrames(shots, FPS);
    for (const s of shots) {
      const c = clips[s.clipId];
      const len = s.frames / FPS;
      s.srcStart = Math.min(s.srcStart, Math.max(0, c.info.duration - len - 0.05));
      Object.assign(s, CX[s.cx] ? { cx0: CX[s.cx], cx1: CX[s.cx] } : framing(c, s.srcStart, s.srcStart + len));
    }
  } else {
    const built = buildSpeechShots(project.speech, clips, FPS);
    if (!built.shots.length) throw new Error('Tutte le parti sono state tolte: non resta niente da montare.');
    shots = built.shots;
    words = built.words;
    bodyAudio = { type: 'body', bed: S.musicaSottoParlato && listMusic()[0] ? path.join(ROOT, 'ASSETS', 'musica', listMusic()[0]) : null };
  }
  const endDur = S.finale ? Number(cfg.finale.durata) || 3.5 : 0;
  log(`${shots.length} inquadrature, look "${look.label}", formati: ${S.formati.join(', ')}`);

  const workDir = path.join(ROOT, '.lavoro', `${id}_${Date.now()}`);
  copyFonts(workDir);
  const logo = brandLogo(cfg);
  const outName = `${stamp()}_${slug(S.nome || S.titolo || project.clips[0].name.replace(/\.[^.]+$/, ''))}`;
  const outDir = anteprima ? projectDir(id) : path.join(ROOT, 'OUTPUT', outName);
  const formati = anteprima ? ['9x16'] : S.formati;
  fs.mkdirSync(outDir, { recursive: true });
  const results = [];
  const share = 99 / formati.length;

  for (let fi = 0; fi < formati.length; fi++) {
    const fk = formati[fi];
    const { W, H } = anteprima ? { W: 540, H: 960 } : FORMATS[fk];
    const base = 1 + share * fi;
    const dir = path.join(workDir, fk);
    fs.mkdirSync(dir, { recursive: true });
    log(`— Formato ${FORMATS[fk].label} —`);
    const shotFiles = [];
    for (let i = 0; i < shots.length; i++) {
      const s = shots[i];
      const c = clips[s.clipId];
      const out = path.join(dir, `shot_${String(i).padStart(3, '0')}.mkv`);
      progress(base + share * 0.65 * (i / shots.length), `Monto le inquadrature (${fk})`);
      await renderShot({
        file: c.info.file, info: c.info, srcStart: s.srcStart, frames: s.frames, fps: FPS, W, H, shot: s, preset: look, reframe,
        audio: mode === 'speech' ? { ...s.audio, fadeIn: s.fadeIn, fadeOut: s.fadeOut } : null, out, workDir,
      });
      shotFiles.push(out);
    }
    progress(base + share * 0.65, `Unisco e aggiungo transizioni (${fk})`);
    const body = path.join(dir, 'corpo.mkv');
    const bodyFrames = await assembleBody({
      shots, files: shotFiles, fps: FPS, withAudio: mode === 'speech', out: body, workDir,
      onProgress: (p) => progress(base + share * (0.65 + 0.1 * p), `Unisco e aggiungo transizioni (${fk})`),
    });
    const bodyT = bodyFrames / FPS;

    let end = null, endFrames = 0;
    if (endDur > 0) {
      progress(base + share * 0.77, `Schermata finale (${fk})`);
      const bg = path.join(dir, 'sfondo.jpg');
      await grabFrame(shotFiles[shotFiles.length - 1], bg, { fromEnd: true, workDir });
      end = path.join(dir, 'finale.mkv');
      endFrames = await renderEndscreen({ bgFrame: bg, logo, W, H, dur: endDur, fps: FPS, out: end, workDir });
    }
    const XF = end ? Math.round(0.5 * FPS) : 0;
    const ass = assFor(cfg, S, {
      W, H, bodyT, hasLogo: !!logo, words: mode === 'speech' && S.sottotitoli ? words : null,
      end: end ? endTexts(cfg, S, (bodyFrames - XF) / FPS, endDur) : null,
    });
    fs.writeFileSync(path.join(dir, 'testi.ass'), ass, 'utf8');

    progress(base + share * 0.85, `Render finale (${fk})`);
    const outFile = anteprima ? path.join(outDir, 'anteprima.mp4') : path.join(outDir, `${slug(S.nome || S.titolo || 'video')}_${fk}.mp4`);
    const audio = mode === 'highlight' ? { type: 'music', file: project.music.file, start: shots[0].slotStart } : bodyAudio;
    const T = await renderFinal({
      body, bodyFrames, end, endFrames, ass: `${fk}/testi.ass`, fps: FPS, audio, out: outFile, workDir,
      onProgress: (p) => progress(base + share * (0.85 + 0.15 * p), `Render finale (${fk})`),
    });
    const cover = path.join(outDir, `${slug(S.nome || S.titolo || 'video')}_${fk}_copertina.jpg`);
    if (!anteprima) await grabFrame(outFile, cover, { at: Math.min(1.2, T / 3), workDir }).catch(() => {});
    results.push({ formato: fk, file: outFile, copertina: cover, durata: +T.toFixed(1) });
    log(`✔ Pronto: ${path.basename(outFile)} (${T.toFixed(1)}s)`);
  }

  if (anteprima) {
    fs.rmSync(workDir, { recursive: true, force: true });
    progress(100, 'Anteprima pronta');
    log(`Anteprima reale pronta in ${((Date.now() - t0) / 60000).toFixed(1)} minuti`);
    return { anteprima: true, progetto: id, file: 'anteprima.mp4' };
  }
  if (words?.length) fs.writeFileSync(path.join(outDir, 'trascrizione.txt'), words.map((w) => w.text).join(' '));
  fs.writeFileSync(path.join(outDir, 'testo-post.txt'), postCaption(cfg.brand, S.preset, S), 'utf8');
  fs.writeFileSync(path.join(outDir, 'dettagli-montaggio.json'), JSON.stringify({
    progetto: id, modalita: mode, stile: S.preset, look: S.look, musica: project.music?.file ?? null, bpm: project.music?.bpm ?? null,
    inquadrature: shots.map((s) => ({ clip: clips[s.clipId].name, da: +s.srcStart.toFixed(2), frames: s.frames, zoom: s.zoom, transizione: s.transOut?.type ?? null })),
    risultati: results,
  }, null, 2));
  fs.rmSync(workDir, { recursive: true, force: true });
  project.esportato = { quando: new Date().toISOString(), cartella: outDir };
  saveProject(project);
  progress(100, 'Finito');
  log(`Tempo totale: ${((Date.now() - t0) / 60000).toFixed(1)} minuti. Cartella: ${outDir}`);
  return { outDir, results, mode, progetto: id };
}

// Tutto automatico: prepara e renderizza subito, senza passare dall'editor.
export async function runJob(job, { emit = () => {} } = {}) {
  let prep;
  try {
    prep = await prepareProject(job, { emit, scale: (p) => p * 0.4 });
  } catch (e) {
    if (e.code !== 'PARLATO_SCARSO') throw e;
    emit({ type: 'log', msg: 'Poco parlato riconosciuto (probabile rumore di festa): uso il montaggio musicale' });
    prep = await prepareProject({ ...job, mode: 'highlight' }, { emit, scale: (p) => p * 0.4 });
  }
  const { progetto } = prep;
  return renderProject(progetto, { emit, scale: (p) => 40 + p * 0.6 });
}
