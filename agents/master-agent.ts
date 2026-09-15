// Agente "Direttore" — orchestratore giornaliero. Esegue tutti gli agenti
// specializzati nell'ordine corretto (media -> contenuti -> lead -> analytics
// -> strategia). La pubblicazione vera e propria è gestita a parte da
// publishing-agent.ts, eseguito più volte al giorno per trovare l'orario
// migliore (vedi .github/workflows/publish-check.yml).
import "dotenv/config";
import { logAgentRun } from "../lib/agentLog.js";
import { IDENTITA } from "./identities.js";
import { eseguiMediaAgent } from "./media-agent.js";
import { eseguiContentAgent } from "./content-agent.js";
import { eseguiLeadsAgent } from "./leads-agent.js";
import { eseguiAnalyticsAgent } from "./analytics-agent.js";
import { eseguiStrategyAgent } from "./strategy-agent.js";

async function eseguiPasso(nome: string, fn: () => Promise<void>): Promise<void> {
  console.log(`\n[Direttore] → avvio ${nome}...`);
  try {
    await fn();
    console.log(`[Direttore] ✓ ${nome} completato.`);
  } catch (err) {
    // Ogni agente gestisce già i propri errori internamente e li logga;
    // qui evitiamo solo che un crash imprevisto blocchi gli agenti successivi.
    console.error(`[Direttore] ✗ ${nome} ha generato un errore non gestito:`, err);
  }
}

export async function eseguiMasterAgent(): Promise<void> {
  console.log("=== Direttore: avvio del ciclo giornaliero degli agenti ===");

  await eseguiPasso("Agente Media (Occhio)", eseguiMediaAgent);
  await eseguiPasso("Agente Contenuti (Copy)", eseguiContentAgent);
  await eseguiPasso("Agente Lead (Cacciatore)", eseguiLeadsAgent);
  await eseguiPasso("Agente Analytics (Analista)", eseguiAnalyticsAgent);
  await eseguiPasso("Agente Strategia (Stratega)", eseguiStrategyAgent);

  await logAgentRun({
    agente: IDENTITA.master.nome,
    identita: IDENTITA.master.ruolo,
    status: "ok",
    riepilogo: "Ciclo giornaliero completato: contenuto del giorno preparato, lead controllati, KPI e strategia aggiornati. La pubblicazione avverrà al prossimo controllo orario utile."
  });

  console.log("\n=== Direttore: ciclo completato ===");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiMasterAgent();
}
