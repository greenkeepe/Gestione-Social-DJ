import { aggiornaDatiSuGitHub } from "./dataSource";
import type { AgentRun, AgentRunsFile } from "./types";

// Equivalente di lib/agentLog.ts (usato dagli agenti su GitHub Actions), ma
// per le route della dashboard che girano su Vercel: nessun filesystem
// scrivibile né commit locale disponibili lì, quindi si passa dalla
// GitHub Contents API come tutte le altre scritture della dashboard.
export async function registraEsitoAgente(run: Omit<AgentRun, "timestamp">): Promise<void> {
  await aggiornaDatiSuGitHub<AgentRunsFile>(
    "agent-runs.json",
    (attuale) => {
      attuale.runs.unshift({ ...run, timestamp: new Date().toISOString() });
      // stessa politica di lib/agentLog.ts: solo le ultime 500 esecuzioni
      attuale.runs = attuale.runs.slice(0, 500);
      return attuale;
    },
    `chore(locali): esito ${run.agente}`
  );
}
