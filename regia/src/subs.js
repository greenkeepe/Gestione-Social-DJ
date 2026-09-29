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

// Testi in sovrimpressione "d'impatto": maiuscolo, niente emoji, a capo in righe corte (max 3)
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
const bigLines = (s, max) => {
  const words = clean(String(s ?? '').replace(EMOJI, '')).replace(/\\N/g, ' ').toUpperCase().split(/\s+/).filter(Boolean);
  // se non sta in 3 righe si allungano le righe, mai tagliare parole
  for (let m = max; ; m += 2) {
    const rows = [];
    for (const w of words) {
      const last = rows[rows.length - 1];
      if (last && (last + ' ' + w).length <= m) rows[rows.length - 1] = `${last} ${w}`;
      else rows.push(w);
    }
    if (rows.length <= 3 || m > max + 16) return rows;
  }
};

export function buildAss({ W, H, fonts, colors, title, subtitle, words, bodyT, end, hasLogo, overlay }) {
  const vertical = H > W;
  const U = Math.min(W, H);
  const D = fonts.display, X = fonts.testi;
  const acc = assColor(colors.accento), txt = assColor(colors.testo);
  const sh = (k) => Math.max(1, Math.round(U * k));
  const style = (name, font, size, color, bold, spacing, outline, shadow, back = '&H96000000', italic = 0, outlineColor = '&H00000000') =>
    `Style: ${name},${font},${Math.round(U * size)},${color},${color},${outlineColor},${back},${bold},${italic},0,0,100,100,${spacing},0,1,${outline},${shadow},5,40,40,40,1`;
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
    // Testi AI in sovrimpressione: bianco pieno, grassetto + bordo bianco (li "ispessisce"), ombra scura per leggerli su ogni sfondo
    style('Big', X, vertical ? 0.108 : 0.075, '&H00FFFFFF', -1, sh(0.001), sh(0.0036), sh(0.005), '&H80000000', 0, '&H00FFFFFF'),
    style('BigEnd', X, vertical ? 0.09 : 0.066, '&H00FFFFFF', -1, sh(0.001), sh(0.0033), sh(0.0045), '&H80000000', 0, '&H00FFFFFF'),
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

  // ---- testi AI in sovrimpressione: aggancio iniziale, frasi durante il video, frase finale ----
  // overlay = { hook, frasi: [], finale }. Con i sottotitoli del parlato (words) le frasi centrali si
  // saltano e aggancio/finale vanno in alto, per non sovrapporsi.
  if (overlay && bodyT > 4) {
    const maxCh = vertical ? 12 : 22;
    const conSub = !!words?.length;
    const yCentro = Math.round(H * (conSub ? 0.3 : vertical ? 0.46 : 0.5));
    const fine = (t) => Math.min(t, bodyT - 0.15);
    // Ogni riga è un evento a sé (interlinea controllata, niente righe che si toccano), disegnata due
    // volte: sotto un alone nero sfumato (leggibile anche su sfondi chiari), sopra il testo bianco.
    // anim(riga, x, y) -> tag di posizione/animazione; parola(w, k, alpha) -> testo di una parola.
    const bigText = (t0, t1, styleName, rows, yMid, anim, parola = (w) => w) => {
      const size = Math.round(U * (styleName === 'BigEnd' ? (vertical ? 0.09 : 0.066) : vertical ? 0.108 : 0.075));
      const lineH = Math.round(size * 1.12);
      const y0 = Math.round(yMid - ((rows.length - 1) * lineH) / 2);
      const halo = `\\1c&H000000&\\3c&H000000&\\bord${sh(0.016)}\\shad0\\blur${sh(0.012)}`;
      let k = 0;
      rows.forEach((r, i) => {
        const y = y0 + i * lineH;
        const ws = r.split(' ');
        const kk = k;
        k += ws.length;
        const testo = (alpha) => ws.map((w, j) => parola(w, kk + j, alpha)).join(' ');
        ev(t0, t1, styleName, `{${anim(i, cx, y)}${halo}\\alpha&H70&}${testo('&H70&')}`, 3);
        ev(t0, t1, styleName, `{${anim(i, cx, y)}}${testo('&H00&')}`, 4);
      });
    };

    // aggancio: entra con un "pop" e le parole compaiono una dopo l'altra
    let fineHook = 0;
    if (overlay.hook && !title) {
      const rows = bigLines(overlay.hook, maxCh);
      const t0 = 0.35, t1 = fine(Math.min(3.8, Math.max(3.2, bodyT * 0.13)));
      fineHook = t1;
      bigText(t0, t1, 'Big', rows, yCentro,
        (i, x, y) => `\\pos(${x},${y})\\fscx72\\fscy72\\t(0,180,\\fscx106\\fscy106)\\t(180,300,\\fscx100\\fscy100)\\fad(0,220)`,
        (w, k, alpha) => {
          const d = 80 + 150 * k;
          return `{\\alpha&HFF&\\t(${d},${d + 110},\\alpha${alpha})}${w}`;
        });
    }

    // frasi: distribuite nel video, ognuna con un effetto diverso
    const frasi = conSub ? [] : (overlay.frasi || []).filter(Boolean).slice(0, 3);
    if (frasi.length) {
      const da = Math.max(fineHook + 0.4, Math.min(4.6, bodyT * 0.2)), a = bodyT - 4.2;
      const dur = Math.min(2.6, Math.max(1.8, (a - da) / frasi.length - 0.8));
      frasi.forEach((f, i) => {
        const t0 = da + ((a - da) * (i + 0.5)) / frasi.length - dur / 2;
        if (t0 < 0.5 || t0 + dur > bodyT - 3.2) return;
        const dx = Math.round(W * 0.14), dy = Math.round(H * 0.05);
        const effetto = [
          (r, x, y) => `\\pos(${x},${y})\\fscx60\\fscy60\\t(0,200,\\fscx108\\fscy108)\\t(200,320,\\fscx100\\fscy100)\\fad(0,200)`, // pop
          (r, x, y) => `\\move(${x + dx * (r % 2 ? -1 : 1)},${y},${x},${y},${r * 70},${r * 70 + 280})\\fad(180,200)`, // righe che scivolano dai lati
          (r, x, y) => `\\move(${x},${y + dy},${x},${y},${r * 90},${r * 90 + 300})\\fad(160,200)`, // righe che salgono una dopo l'altra
        ][i % 3];
        bigText(t0, t0 + dur, 'Big', bigLines(f, maxCh), Math.round(H * (vertical ? 0.6 : 0.56)), effetto);
      });
    }

    // frase finale (invito), subito prima della schermata finale: entra con uno zoom
    // (mai sovrapposta all'aggancio: sui video molto corti, se non c'è posto, si salta)
    const t1f = fine(bodyT - 0.1), t0f = Math.max(1, fineHook + 0.15, t1f - 2.4);
    if (overlay.finale && t1f - t0f >= 1.2) {
      const t1 = t1f, t0 = t0f;
      bigText(t0, t1, 'BigEnd', bigLines(overlay.finale, maxCh + 3), conSub ? yCentro : Math.round(H * 0.5),
        (r, x, y) => `\\pos(${x},${y})\\fscx135\\fscy135\\t(0,260,\\fscx100\\fscy100)\\fad(200,250)`);
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
