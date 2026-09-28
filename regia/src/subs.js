// Testi animati in formato ASS: titolo iniziale, sottotitoli "karaoke" parola per parola, testi della schermata finale.
// Stile coordinato con il brand: font "display" per titoli/slogan, font "testi" per sottotitoli e contatti.

const ts = (t) => {
  t = Math.max(0, t);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
};
const clean = (s) => String(s ?? '').replace(/[{}\\]/g, '').replace(/\r?\n/g, '\\N').trim();

// "#RRGGBB" -> "&H00BBGGRR"
export const assColor = (hex, alpha = '00') => {
  const h = String(hex || '#FFFFFF').replace('#', '').padEnd(6, 'F');
  return `&H${alpha}${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase();
};

// Frasi lunghe su due righe ("Il tuo matrimonio. La sua colonna sonora." -> due righe)
const twoLines = (s) => {
  const t = clean(s);
  const m = t.match(/^(.+?[.!?])\s+(.+)$/);
  if (m) return `${m[1]}\\N${m[2]}`;
  if (t.length > 26) {
    const mid = t.lastIndexOf(' ', Math.ceil(t.length / 2) + 3);
    if (mid > 0) return `${t.slice(0, mid)}\\N${t.slice(mid + 1)}`;
  }
  return t;
};

export function buildAss({ W, H, fonts, colors, title, subtitle, words, bodyT, end, hasLogo }) {
  const vertical = H > W;
  const U = Math.min(W, H);
  const D = fonts.display, X = fonts.testi;
  const acc = assColor(colors.accento), txt = assColor(colors.testo);
  const sh = (k) => Math.max(1, Math.round(U * k));
  const style = (name, font, size, color, bold, spacing, outline, shadow, back = '&H96000000', italic = 0) =>
    `Style: ${name},${font},${Math.round(U * size)},${color},${color},&H00000000,${back},${bold},${italic},0,0,100,100,${spacing},0,1,${outline},${shadow},5,40,40,40,1`;
  const lines = [
    '[Script Info]', 'ScriptType: v4.00+', `PlayResX: ${W}`, `PlayResY: ${H}`, 'WrapStyle: 0', 'ScaledBorderAndShadow: yes', '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    style('Title', D, 0.1, txt, 0, sh(0.008), sh(0.0015), sh(0.006), '&HA0000000'),
    style('TitleSub', X, 0.042, acc, -1, sh(0.01), sh(0.0015), sh(0.004), '&HA0000000'),
    style('Cap', X, vertical ? 0.075 : 0.058, '&H00FFFFFF', -1, 1, sh(0.006), sh(0.003), '&H80000000'),
    style('Brand', D, 0.1, txt, 0, sh(0.01), 0, sh(0.004)),
    style('Slogan', D, 0.062, txt, 0, 1, 0, sh(0.004), '&H96000000', -1),
    style('Cta', X, 0.036, acc, -1, sh(0.006), 0, sh(0.003)),
    style('Info', X, 0.04, txt, 0, sh(0.002), 0, sh(0.003)),
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];
  const ev = (st, en, st_, text, layer = 0) => lines.push(`Dialogue: ${layer},${ts(st)},${ts(en)},${st_},,0,0,0,,${text}`);
  const cx = Math.round(W / 2);

  // ---- titolo iniziale: entra dal basso, lettere che si stringono ----
  if (title) {
    const y = Math.round(H * (vertical ? 0.42 : 0.45));
    const tEnd = Math.min(3.2, Math.max(1.8, bodyT * 0.3));
    ev(0.15, tEnd, 'Title', `{\\move(${cx},${y + 40},${cx},${y},0,500)\\fad(250,350)\\fsp${sh(0.03)}\\t(0,900,0.6,\\fsp${sh(0.008)})\\blur6\\t(0,400,\\blur0)}${twoLines(title).toUpperCase()}`, 2);
    if (subtitle) {
      const y2 = y + Math.round(U * (twoLines(title).includes('\\N') ? 0.16 : 0.1));
      ev(0.55, tEnd, 'TitleSub', `{\\move(${cx},${y2 + 24},${cx},${y2},0,450)\\fad(300,350)}${clean(subtitle).toUpperCase()}`, 2);
    }
  }

  // ---- sottotitoli karaoke ----
  if (words?.length) {
    const y = Math.round(H * (vertical ? 0.7 : 0.82));
    const chunks = [];
    let cur = [];
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const prev = cur[cur.length - 1];
      const len = cur.reduce((s, x) => s + x.text.length + 1, 0);
      if (cur.length && (cur.length >= 3 || len + w.text.length > (vertical ? 18 : 28) || w.start - prev.end > 0.5 || /[.!?]$/.test(prev.text))) {
        chunks.push(cur); cur = [];
      }
      cur.push(w);
    }
    if (cur.length) chunks.push(cur);
    chunks.forEach((ch, ci) => {
      const next = chunks[ci + 1];
      const chEnd = Math.min(ch[ch.length - 1].end + 0.35, next ? next[0].start : Infinity, bodyT);
      ch.forEach((w, wi) => {
        const st = w.start;
        const en = wi < ch.length - 1 ? ch[wi + 1].start : chEnd;
        if (en <= st) return;
        const t = ch.map((x, xi) => {
          const s = clean(x.text).toUpperCase();
          return xi === wi ? `{\\c${acc}\\fscx106\\fscy106\\t(0,90,\\fscx114\\fscy114)\\t(90,200,\\fscx106\\fscy106)}${s}{\\r}` : s;
        }).join(' ');
        const pop = wi === 0 ? '\\fscx80\\fscy80\\t(0,120,\\fscx100\\fscy100)' : '';
        ev(st, en, 'Cap', `{\\pos(${cx},${y})${pop}}${t}`, 1);
      });
    });
  }

  // ---- schermata finale: (logo) → slogan → invito → contatti, in sequenza ----
  if (end) {
    const t0 = end.start, t1 = end.start + end.dur;
    let y = Math.round(H * (hasLogo ? (vertical ? 0.5 : 0.55) : 0.4));
    const item = (delay, st, text, gapAfter) => {
      if (!text) return;
      const rows = (text.match(/\\N/g) || []).length;
      y += Math.round(U * 0.03 * rows);
      ev(t0 + delay, t1, st, `{\\move(${cx},${y + 30},${cx},${y},0,450)\\fad(350,0)\\blur4\\t(0,380,\\blur0)}${text}`, 3);
      y += Math.round(U * (gapAfter + 0.03 * rows));
    };
    if (!hasLogo || end.mostraNome) item(0.45, 'Brand', clean(end.nome).toUpperCase(), 0.1);
    item(0.6, 'Slogan', twoLines(end.slogan), 0.1);
    item(0.95, 'Cta', clean(end.cta).toUpperCase(), 0.085);
    for (const [i, t] of end.contatti.filter(Boolean).entries()) item(1.15 + i * 0.12, 'Info', clean(t), 0.052);
  }
  return lines.join('\n') + '\n';
}
