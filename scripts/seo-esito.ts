// Porta l'esito settimanale del motore SEO (site/data/seo/seo-stato.json,
// scritto da site/scripts/seo/propose-fixes.ts e run-all.ts) nel registro
// agenti: così compare in dashboard (Agenti, Panoramica "Da controllare") e,
// dopo 2 errori di fila, arriva l'avviso su Telegram. Prima gli errori del
// motore SEO restavano solo nel log di GitHub Actions.
// Eseguito dal workflow seo-gsc.yml dopo "npm run seo:all".
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { logAgentRun } from "../lib/agentLog.js";
import { IDENTITA } from "../agents/identities.js";

interface StatoSeo {
  aggiornatoIl?: string;
  opportunita?: number;
  proposteNuove?: number;
  problemi?: string[];
  stepFalliti?: string[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATO = path.resolve(__dirname, "..", "site", "data", "seo", "seo-stato.json");

async function main() {
  let stato: StatoSeo = {};
  try {
    stato = JSON.parse(await readFile(STATO, "utf-8")) as StatoSeo;
  } catch {
    stato = { problemi: ["stato del motore SEO non trovato (site/data/seo/seo-stato.json)"] };
  }
  const problemi = [...(stato.problemi ?? []), ...(stato.stepFalliti ?? []).map((s) => `step fallito: ${s}`)];
  const proposte = stato.proposteNuove ?? 0;
  const opportunita = stato.opportunita ?? 0;

  await logAgentRun({
    agente: IDENTITA.seo.nome,
    identita: IDENTITA.seo.ruolo,
    // errore solo se c'erano opportunità ma nessuna proposta è stata creata per colpa di un problema
    status: problemi.length && !proposte ? "errore" : proposte ? "ok" : "nessuna-azione",
    riepilogo:
      (proposte
        ? `${proposte} nuove proposte di titolo/descrizione da rivedere nella pagina SEO.`
        : `Nessuna nuova proposta (${opportunita} opportunità trovate).`) +
      (problemi.length ? ` Problemi: ${problemi.join("; ").slice(0, 400)}` : ""),
    ...(problemi.length ? { dettagli: { problemi } } : {})
  });
}

main().catch((err) => {
  console.error("[seo-esito]", err);
  process.exitCode = 1;
});
