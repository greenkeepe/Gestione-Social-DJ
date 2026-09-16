// Genera l'immagine "cartolina" per un post di testimonianza: il testo
// reale della recensione (mai alterato, mai passato a un LLM) disegnato su
// uno sfondo brandizzato, cliente/evento/stelle sotto. Serve perché
// Instagram/Facebook richiedono sempre un'immagine o un video: non si può
// pubblicare solo testo. Nessuna libreria di rendering pesante: un SVG
// costruito a mano, rasterizzato in PNG con sharp (dipendenza leggera, già
// pronta all'uso su GitHub Actions senza bisogno di un browser headless).
import sharp from "sharp";

export interface Testimonianza {
  cliente: string;
  tipoEvento: string;
  data: string;
  valutazione: number;
  citazione: string;
}

const LARGHEZZA = 1080;
const ALTEZZA = 1080;

function escapeXml(testo: string): string {
  return testo
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Spezza il testo in righe che stanno nella larghezza disponibile, senza
// tagliare le parole. Stima approssimativa (nessuna libreria di metriche
// font): sufficiente per un risultato leggibile, non serve la precisione
// pixel-perfect di un vero text layout engine.
function spezzaRighe(testo: string, maxCaratteriPerRiga: number): string[] {
  const parole = testo.split(/\s+/);
  const righe: string[] = [];
  let corrente = "";

  for (const parola of parole) {
    const prova = corrente ? `${corrente} ${parola}` : parola;
    if (prova.length > maxCaratteriPerRiga && corrente) {
      righe.push(corrente);
      corrente = parola;
    } else {
      corrente = prova;
    }
  }
  if (corrente) righe.push(corrente);
  return righe;
}

function stelle(valutazione: number): string {
  const piene = Math.max(0, Math.min(5, Math.round(valutazione)));
  return "★".repeat(piene) + "☆".repeat(5 - piene);
}

export async function generaCartTestimonianza(t: Testimonianza, opts: { nomeArte: string; tagline?: string }): Promise<Buffer> {
  // Dimensione del font adattata alla lunghezza della citazione: più è
  // lunga, più piccolo il testo, per stare comunque nello spazio disponibile.
  const lunghezza = t.citazione.length;
  const fontSize = lunghezza <= 100 ? 50 : lunghezza <= 180 ? 42 : lunghezza <= 260 ? 34 : 28;
  const maxCaratteri = lunghezza <= 100 ? 24 : lunghezza <= 180 ? 30 : lunghezza <= 260 ? 38 : 46;
  const interlinea = fontSize * 1.35;

  const righe = spezzaRighe(t.citazione, maxCaratteri).slice(0, 10);
  const altezzaBloccoTesto = righe.length * interlinea;
  const yIniziale = ALTEZZA / 2 - altezzaBloccoTesto / 2 + fontSize / 2;

  const righeSvg = righe
    .map((riga, i) => `<text x="${LARGHEZZA / 2}" y="${yIniziale + i * interlinea}" text-anchor="middle" class="citazione">${escapeXml(riga)}</text>`)
    .join("\n");

  const yStelle = yIniziale + righe.length * interlinea + 50;
  const yCliente = yStelle + 60;
  const yEvento = yCliente + 42;

  const svg = `
<svg width="${LARGHEZZA}" height="${ALTEZZA}" viewBox="0 0 ${LARGHEZZA} ${ALTEZZA}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sfondo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4c3a8c" />
      <stop offset="100%" stop-color="#241a42" />
    </linearGradient>
  </defs>
  <rect width="${LARGHEZZA}" height="${ALTEZZA}" fill="url(#sfondo)" />
  <text x="90" y="230" font-family="Georgia, 'Liberation Serif', serif" font-size="220" fill="#c28a2e" opacity="0.35">&#8220;</text>
  <style>
    .citazione { font-family: Georgia, 'Liberation Serif', serif; font-style: italic; font-size: ${fontSize}px; fill: #ffffff; }
    .stelle { font-family: 'DejaVu Sans', Verdana, sans-serif; font-size: 44px; fill: #e3b45a; }
    .cliente { font-family: Verdana, 'DejaVu Sans', sans-serif; font-size: 34px; font-weight: bold; fill: #ffffff; }
    .evento { font-family: Verdana, 'DejaVu Sans', sans-serif; font-size: 26px; fill: #d8cdf0; }
    .brand { font-family: Georgia, 'Liberation Serif', serif; font-size: 32px; fill: #e3b45a; }
  </style>
  ${righeSvg}
  <text x="${LARGHEZZA / 2}" y="${yStelle}" text-anchor="middle" class="stelle">${stelle(t.valutazione)}</text>
  <text x="${LARGHEZZA / 2}" y="${yCliente}" text-anchor="middle" class="cliente">${escapeXml(t.cliente)}</text>
  <text x="${LARGHEZZA / 2}" y="${yEvento}" text-anchor="middle" class="evento">${escapeXml(t.tipoEvento)}</text>
  <rect x="${LARGHEZZA / 2 - 60}" y="${ALTEZZA - 130}" width="120" height="2" fill="#c28a2e" opacity="0.6" />
  <text x="${LARGHEZZA / 2}" y="${ALTEZZA - 80}" text-anchor="middle" class="brand">${escapeXml(opts.nomeArte)}</text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
