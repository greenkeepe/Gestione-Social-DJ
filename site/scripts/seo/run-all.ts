// Esegue in sequenza tutta la pipeline dell'SEO Engine. Ogni step è
// indipendente: se uno fallisce (es. credenziali Search Console non ancora
// configurate) gli altri vengono comunque eseguiti, così il workflow
// settimanale continua a produrre dati utili invece di bloccarsi del tutto.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = ["sync-gsc.ts", "check-indexing.ts", "detect-opportunities.ts", "propose-fixes.ts", "check-internal-links.ts", "submit-indexnow.ts"];
const failures: string[] = [];

for (const script of SCRIPTS) {
  const scriptPath = path.join(__dirname, script);
  console.log(`\n=== Eseguo ${script} ===`);
  const result = spawnSync("npx", ["tsx", scriptPath], { stdio: "inherit" });
  if (result.status !== 0) {
    failures.push(script);
    console.error(`[seo] ${script} ha fallito (exit code ${result.status}) — continuo con gli step successivi.`);
  }
}

// Aggiunge gli step falliti a data/seo/seo-stato.json (scritto da
// propose-fixes.ts): il passo "Esito SEO" del workflow li porta nel registro
// agenti, così un problema non resta nascosto nel log di GitHub.
{
  const statoFile = path.resolve(__dirname, "../../data/seo/seo-stato.json");
  let stato: Record<string, unknown> = { aggiornatoIl: new Date().toISOString(), problemi: [] };
  try {
    stato = JSON.parse(readFileSync(statoFile, "utf-8"));
  } catch {
    /* propose-fixes non ha scritto nulla: si parte da uno stato vuoto */
  }
  stato.stepFalliti = failures;
  mkdirSync(path.dirname(statoFile), { recursive: true });
  writeFileSync(statoFile, JSON.stringify(stato, null, 2) + "\n", "utf-8");
}

if (failures.length === SCRIPTS.length) {
  console.error("\n[seo] Tutti gli step sono falliti.");
  process.exitCode = 1;
} else if (failures.length > 0) {
  console.warn(`\n[seo] Step falliti (il job continua comunque): ${failures.join(", ")}`);
} else {
  console.log("\n[seo] Tutti gli step completati.");
}
