// Opportunity Detector: analizza i dati grezzi di Search Console con regole
// deterministiche e documentate (nessun "SEO score" proprietario, nessuna
// AI). Segnala, non pubblica né modifica nulla in automatico.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { siteRoutes } from "../../data/routes";
import { localAreas } from "./lib/local-areas";
import type { GscDataFile, OpportunitiesFile, OpportunityPriority, SeoOpportunity } from "../../lib/seoEngineTypes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data/seo");
const INPUT_FILE = path.join(DATA_DIR, "gsc-data.json");
const OUTPUT_FILE = path.join(DATA_DIR, "opportunities.json");

// Soglie esplicite: fascia 5-20 (vicina a prima pagina ma non ancora
// arrivata), un minimo di impression per escludere query irrilevanti, e un
// CTR sotto il 3% considerato basso in quella fascia. Vedi
// site/docs/seo-engine.md per la spiegazione estesa di ciascuna soglia.
const POSITION_RANGE: [number, number] = [5, 20];
const MIN_IMPRESSIONS_TO_CONSIDER = 30;
const LOW_CTR_THRESHOLD = 0.03;
const HIGH_IMPRESSIONS_THRESHOLD = 300;
const MEDIUM_IMPRESSIONS_THRESHOLD = 100;

function detectLocalArea(query: string): string | null {
  const lower = query.toLowerCase();
  return localAreas.find((area) => lower.includes(area.toLowerCase())) ?? null;
}

function priorityFor(impressions: number, position: number, ctr: number): OpportunityPriority | null {
  const inRange = position >= POSITION_RANGE[0] && position <= POSITION_RANGE[1];
  if (!inRange || impressions < MIN_IMPRESSIONS_TO_CONSIDER || ctr >= LOW_CTR_THRESHOLD) {
    return null;
  }
  if (impressions >= HIGH_IMPRESSIONS_THRESHOLD) return "HIGH";
  if (impressions >= MEDIUM_IMPRESSIONS_THRESHOLD) return "MEDIUM";
  return "LOW";
}

function reasonFor(query: string, impressions: number, position: number, ctr: number, localArea: string | null, pageExists: boolean): string {
  const parts = [
    `La query genera ${impressions} impression con una posizione media di ${position.toFixed(1)} (fascia 5-20, non ancora prima pagina), ma un CTR del ${(ctr * 100).toFixed(1)}%, relativamente basso per questa posizione.`,
    "Valutare se title, meta description e contenuto della pagina rispondono pienamente all'intento di ricerca.",
  ];
  if (localArea) {
    parts.push(
      `Contiene un riferimento geografico locale ("${localArea}"): possibile opportunità locale, da verificare manualmente — NON creare automaticamente una pagina dedicata.`,
    );
  }
  if (!pageExists) {
    parts.push(`Nessuna pagina del sito corrisponde esattamente a "${query}": valutare se arricchire una pagina esistente invece di crearne una nuova.`);
  }
  return parts.join(" ");
}

async function loadGscData(): Promise<GscDataFile> {
  try {
    const raw = await readFile(INPUT_FILE, "utf-8");
    return JSON.parse(raw) as GscDataFile;
  } catch {
    console.log("[seo-opportunities] Nessun dato Search Console trovato (esegui prima sync-gsc.ts). Genero un file vuoto.");
    return { generatedAt: null, period: null, totals: { clicks: 0, impressions: 0 }, byQueryPage: [], byDate: [] };
  }
}

async function main() {
  const gscData = await loadGscData();
  const knownPaths = new Set(siteRoutes.map((r) => r.path || "/"));

  const opportunities: SeoOpportunity[] = [];
  for (const row of gscData.byQueryPage) {
    const [query, pageUrl] = row.keys;
    const priority = priorityFor(row.impressions, row.position, row.ctr);
    if (!priority) continue;

    let pagePath = "/";
    try {
      pagePath = new URL(pageUrl).pathname || "/";
    } catch {
      pagePath = pageUrl;
    }
    const pageExists = knownPaths.has(pagePath);
    const localArea = detectLocalArea(query);

    opportunities.push({
      query,
      page: pagePath,
      position: row.position,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      priority,
      reason: reasonFor(query, row.impressions, row.position, row.ctr, localArea, pageExists),
      localArea,
      pageExists,
    });
  }

  const order: Record<OpportunityPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  opportunities.sort((a, b) => order[a.priority] - order[b.priority] || b.impressions - a.impressions);

  const payload: OpportunitiesFile = {
    generatedAt: new Date().toISOString(),
    sourceGeneratedAt: gscData.generatedAt,
    period: gscData.period,
    rules: {
      positionRange: POSITION_RANGE,
      minImpressions: MIN_IMPRESSIONS_TO_CONSIDER,
      lowCtrThreshold: LOW_CTR_THRESHOLD,
      highImpressionsThreshold: HIGH_IMPRESSIONS_THRESHOLD,
      mediumImpressionsThreshold: MEDIUM_IMPRESSIONS_THRESHOLD,
    },
    opportunities,
  };

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, JSON.stringify(payload, null, 2) + "\n", "utf-8");
  console.log(`[seo-opportunities] ${opportunities.length} opportunità individuate, salvate in ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("[seo-opportunities] Errore:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
