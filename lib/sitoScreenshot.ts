// Cattura screenshot reali di pagine del sito con Playwright (Chromium
// headless): nessun servizio a pagamento, il browser gira gratis sui
// runner GitHub Actions (vedi .github/workflows/daily-agents.yml, step
// "Installa Playwright (Chromium)"). Usato solo da agents/sito-agent.ts.
import { chromium } from "playwright";

export interface PaginaSito {
  url: string;
  etichetta: string;
}

// Pagine di servizio/legali che un sito ha quasi sempre in fondo, ma che
// non hanno alcun senso come "vetrina" promozionale su Instagram (nessuno
// vuole un post sulla cookie policy). Filtrate via sia sul percorso URL sia
// sul testo del link, per beccarle anche quando il link è tradotto o ha un
// percorso diverso dall'atteso.
const PAROLE_ESCLUSE = [
  "cookie",
  "privacy",
  "termini",
  "condizioni",
  "legal",
  "note-legali",
  "disclaimer",
  "gdpr",
  "informativa"
];

function paginaDaEscludere(percorso: string, etichetta: string): boolean {
  const testo = `${percorso} ${etichetta}`.toLowerCase();
  if (PAROLE_ESCLUSE.some((parola) => testo.includes(parola))) return true;

  // Selettore di lingua nel menu (es. "FR"/"EN"/"DE" per passare alla
  // versione tradotta del sito) o percorso con prefisso di lingua diversa
  // dall'italiano: il sito parla italiano, la Vetrina mostra solo quello,
  // mai la versione francese/inglese/tedesca/spagnola.
  const etichettaPulita = etichetta.trim().toLowerCase();
  if (/^(it|fr|en|de|es|pt|nl)$/.test(etichettaPulita)) return true;
  if (/^\/(it|fr|en|de|es|pt|nl)(\/|$)/.test(percorso)) return true;

  return false;
}

// Contesto browser in italiano: alcuni siti scelgono la lingua da mostrare
// in base alla lingua del browser (Accept-Language/navigator.language) —
// senza queste opzioni Chromium può negoziare una lingua diversa
// dall'italiano (visto dal vivo: homepage mostrata in francese).
const CONTESTO_ITALIANO = {
  locale: "it-IT",
  timezoneId: "Europe/Rome",
  extraHTTPHeaders: { "Accept-Language": "it-IT,it;q=0.9" }
};

export async function verificaChromiumDisponibile(): Promise<void> {
  try {
    const browser = await chromium.launch();
    await browser.close();
  } catch (err) {
    throw new Error(
      `Chromium (Playwright) non disponibile: ${String(err)}. Sui runner GitHub Actions viene installato dal workflow daily-agents.yml (step "Installa Playwright"); in locale esegui "npx playwright install --with-deps chromium".`
    );
  }
}

// Apre la home del sito e ne estrae i link di navigazione interni (stesso
// dominio, esclusi ancore/mailto/tel/duplicati): così la rotazione delle
// "vetrine" giornaliere segue le pagine REALI del sito, senza bisogno di
// conoscerne a priori la struttura o i selettori CSS (che potrebbero
// cambiare a ogni redesign del sito).
export async function scopriPagineSito(baseUrl: string): Promise<PaginaSito[]> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage(CONTESTO_ITALIANO);
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    const origine = new URL(baseUrl).origin;
    const link = await page.$$eval("a[href]", (elementi: any[]) =>
      elementi.map((el) => ({ href: el.href as string, testo: (el.textContent || "").trim() as string }))
    );

    const percorsoHome = new URL(baseUrl).pathname.replace(/\/$/, "") || "/";
    const viste = new Set<string>([percorsoHome]);
    const pagine: PaginaSito[] = [{ url: baseUrl, etichetta: "Home" }];

    for (const { href, testo } of link) {
      try {
        const u = new URL(href, baseUrl);
        if (u.origin !== origine) continue;
        const percorso = u.pathname.replace(/\/$/, "") || "/";
        if (viste.has(percorso)) continue;
        viste.add(percorso);
        if (paginaDaEscludere(percorso, testo)) continue;
        pagine.push({ url: `${u.origin}${u.pathname}`, etichetta: testo || percorso });
      } catch {
        // href non valido (es. "javascript:void(0)", "mailto:...", ecc.): ignorato
      }
    }

    return pagine;
  } finally {
    await browser.close();
  }
}

// Screenshot in formato verticale 4:5 (1080x1350, ottimo per il feed
// Instagram) della parte superiore di una pagina — il "colpo d'occhio"
// iniziale di quella sezione del sito, non uno scroll a caso.
export async function catturaScreenshotPagina(url: string): Promise<Buffer> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ ...CONTESTO_ITALIANO, viewport: { width: 1080, height: 1350 } });
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const screenshot = await page.screenshot({ type: "png" });
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}
