// Esegue in sequenza tutta la pipeline dell'SEO Engine. Ogni step è
// indipendente: se uno fallisce (es. credenziali Search Console non ancora
// configurate) gli altri vengono comunque eseguiti, così il workflow
// settimanale continua a produrre dati utili invece di bloccarsi del tutto.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = ["sync-gsc.ts", "check-indexing.ts", "detect-opportunities.ts", "propose-fixes.ts", "check-internal-links.ts"];
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

if (failures.length === SCRIPTS.length) {
  console.error("\n[seo] Tutti gli step sono falliti.");
  process.exitCode = 1;
} else if (failures.length > 0) {
  console.warn(`\n[seo] Step falliti (il job continua comunque): ${failures.join(", ")}`);
} else {
  console.log("\n[seo] Tutti gli step completati.");
}
