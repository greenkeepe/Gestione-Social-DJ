// Scarica le performance di ricerca da Google Search Console e le salva come
// JSON in data/seo/ (nessun database: stesso pattern "costo zero" già usato
// dal resto del repository). Eseguito settimanalmente da
// .github/workflows/seo-gsc.yml. Se le credenziali non sono ancora
// configurate, fallisce con un messaggio chiaro senza toccare i dati
// precedenti (il file JSON esistente non viene sovrascritto).
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { fetchSearchAnalytics } from "./lib/gsc-client";
import type { GscDataFile } from "../../lib/seoEngineTypes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../../data/seo");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "gsc-data.json");

// Search Console pubblica dati definitivi con 2-3 giorni di ritardo: la
// finestra si ferma 3 giorni fa per evitare righe parziali/incomplete, e
// copre 28 giorni per avere un campione abbastanza stabile da non essere
// rumoroso (7gg) né troppo datato (90gg).
const DELAY_DAYS = 3;
const WINDOW_DAYS = 28;

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const endDate = isoDateDaysAgo(DELAY_DAYS);
  const startDate = isoDateDaysAgo(DELAY_DAYS + WINDOW_DAYS);

  console.log(`[seo-gsc] Recupero dati Search Console dal ${startDate} al ${endDate}...`);

  const [byQueryPage, byDate] = await Promise.all([
    fetchSearchAnalytics({ startDate, endDate, dimensions: ["query", "page"], rowLimit: 1000 }),
    fetchSearchAnalytics({ startDate, endDate, dimensions: ["date"], rowLimit: 1000 }),
  ]);

  const totals = byDate.reduce(
    (acc, row) => ({
      clicks: acc.clicks + row.clicks,
      impressions: acc.impressions + row.impressions,
    }),
    { clicks: 0, impressions: 0 },
  );

  const payload: GscDataFile = {
    generatedAt: new Date().toISOString(),
    period: { startDate, endDate },
    totals,
    byQueryPage: byQueryPage as GscDataFile["byQueryPage"],
    byDate: byDate as GscDataFile["byDate"],
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, JSON.stringify(payload, null, 2) + "\n", "utf-8");
  console.log(`[seo-gsc] Salvate ${byQueryPage.length} righe query/pagina in ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("[seo-gsc] Errore:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
