// Internal Linking Check: con solo 11 pagine non serve un crawler HTTP.
// Legge direttamente i sorgenti (app/ e components/sections/) e conta i link
// interni editoriali verso ciascuna pagina, per individuare pagine orfane o
// scarsamente collegate. Esclude di proposito la navigazione globale
// (Navbar/Footer/CTA fisse), presente su ogni pagina per definizione e quindi
// non un segnale utile sull'internal linking editoriale.
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { siteRoutes } from "../../data/routes";
import type { InternalLinksFile, InternalLinkRoute } from "../../lib/seoEngineTypes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SCAN_DIRS = [path.join(ROOT, "app"), path.join(ROOT, "components/sections")];
const OUTPUT_FILE = path.join(ROOT, "data/seo/internal-links.json");

const HREF_PATTERN = /href=(["'`])(\/[a-z0-9\-/]*)\1/gi;

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizePath(href: string): string {
  const withoutQueryOrHash = href.split("?")[0].split("#")[0];
  if (withoutQueryOrHash === "") return "/";
  return withoutQueryOrHash.replace(/\/$/, "") || "/";
}

async function main() {
  const inboundBySource: Record<string, Set<string>> = {};

  for (const dir of SCAN_DIRS) {
    const files = await collectFiles(dir);
    for (const file of files) {
      const content = await readFile(file, "utf-8");
      const relativeSource = path.relative(ROOT, file);
      for (const match of content.matchAll(HREF_PATTERN)) {
        const normalized = normalizePath(match[2]);
        if (!inboundBySource[normalized]) inboundBySource[normalized] = new Set();
        inboundBySource[normalized].add(relativeSource);
      }
    }
  }

  const routes: InternalLinkRoute[] = siteRoutes.map((route) => {
    const normalizedPath = route.path === "" ? "/" : route.path;
    const linkedFrom = Array.from(inboundBySource[normalizedPath] ?? []).sort();
    return {
      path: normalizedPath,
      label: route.label,
      inboundContextualLinks: linkedFrom.length,
      linkedFrom,
      status: linkedFrom.length === 0 ? "ORPHAN" : linkedFrom.length === 1 ? "POCO_COLLEGATA" : "OK",
    };
  });

  const payload: InternalLinksFile = {
    generatedAt: new Date().toISOString(),
    note: "Conteggio dei link interni editoriali (pagine app/ e sezioni di contenuto), esclusi Navbar/Footer/CTA globali presenti su ogni pagina. Link con URL dinamici (es. template string con variabili) non vengono rilevati.",
    routes,
  };

  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, JSON.stringify(payload, null, 2) + "\n", "utf-8");

  const orphans = routes.filter((r) => r.status === "ORPHAN");
  console.log(`[seo-internal-links] ${orphans.length} pagine senza link contestuali in ingresso. Salvato in ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("[seo-internal-links] Errore:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
