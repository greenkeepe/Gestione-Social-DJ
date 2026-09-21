// Controlla lo stato di indicizzazione reale (URL Inspection API) di ogni
// pagina pubblicata, per ciascuna lingua (stessa lista di app/sitemap.ts:
// site/data/routes.ts × locali di i18n/routing.ts). Nessuna modifica al
// sito: solo lettura dello stato che Google ha realmente registrato.
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { inspectUrl } from "./lib/gsc-client";
import { siteRoutes } from "../../data/routes";
import { routing } from "../../i18n/routing";
import type { IndexingFile, IndexingRow } from "../../lib/seoEngineTypes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../../data/seo");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "indexing.json");

// L'API accetta fino a 2000 controlli al giorno e 600 al minuto per
// proprietà: con poche decine di URL una chiamata alla volta basta e non
// rischia di saturare la quota.
function buildUrl(siteUrl: string, routePath: string, locale: string): string {
  const base = siteUrl.replace(/\/$/, "");
  const localizedPath = locale === routing.defaultLocale ? routePath : `/${locale}${routePath}`;
  return `${base}${localizedPath === "" ? "/" : localizedPath}`;
}

async function inspectOne(url: string): Promise<IndexingRow> {
  try {
    const result = await inspectUrl(url);
    const status = result.inspectionResult?.indexStatusResult;
    return {
      url,
      verdict: status?.verdict ?? null,
      coverageState: status?.coverageState ?? null,
      robotsTxtState: status?.robotsTxtState ?? null,
      indexingState: status?.indexingState ?? null,
      pageFetchState: status?.pageFetchState ?? null,
      lastCrawlTime: status?.lastCrawlTime ?? null,
      googleCanonical: status?.googleCanonical ?? null,
      userCanonical: status?.userCanonical ?? null,
      sitemaps: status?.sitemap ?? [],
      error: null,
    };
  } catch (err) {
    return {
      url,
      verdict: null,
      coverageState: null,
      robotsTxtState: null,
      indexingState: null,
      pageFetchState: null,
      lastCrawlTime: null,
      googleCanonical: null,
      userCanonical: null,
      sitemaps: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variabile d'ambiente mancante: ${name}`);
  }
  return value;
}

async function main() {
  const siteUrl = requireEnv("GSC_SITE_URL");

  const urls = siteRoutes.flatMap((route) =>
    routing.locales.map((locale) => buildUrl(siteUrl, route.path, locale)),
  );

  console.log(`[seo-indexing] Controllo ${urls.length} URL (${siteRoutes.length} pagine × ${routing.locales.length} lingue)...`);

  const rows: IndexingRow[] = [];
  for (const url of urls) {
    rows.push(await inspectOne(url));
  }

  const payload: IndexingFile = {
    generatedAt: new Date().toISOString(),
    siteUrl,
    rows,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, JSON.stringify(payload, null, 2) + "\n", "utf-8");

  const indexed = rows.filter((r) => r.coverageState === "Submitted and indexed").length;
  const errors = rows.filter((r) => r.error).length;
  console.log(`[seo-indexing] ${indexed}/${rows.length} indicizzate, ${errors} errori. Salvato in ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("[seo-indexing] Errore:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
