import { aggiornaDatiSuGitHub } from "./dataSource";
import { inviaMessaggioTelegram } from "./telegram";
import type { AgentRun, AgentRunsFile } from "./types";

// Equivalente di lib/agentLog.ts (usato dagli agenti su GitHub Actions), ma
// per le route della dashboard che girano su Vercel: nessun filesystem
// scrivibile né commit locale disponibili lì, quindi si passa dalla
// GitHub Contents API come tutte le altre scritture della dashboard.
// Stessa regola di avviso: Telegram dopo 2 errori di fila dello stesso
// agente, al massimo uno al giorno.
export async function registraEsitoAgente(run: Omit<AgentRun, "timestamp">): Promise<void> {
  let avviso: string | null = null;
  await aggiornaDatiSuGitHub<AgentRunsFile>(
    "agent-runs.json",
    (attuale) => {
      const nuovo: AgentRun = { ...run, timestamp: new Date().toISOString() };
      attuale.runs.unshift(nuovo);
      // stessa politica di lib/agentLog.ts: solo le ultime 500 esecuzioni
      attuale.runs = attuale.runs.slice(0, 500);
      avviso = null;
      if (run.status === "errore") {
        const diQuestoAgente = attuale.runs.filter((r) => r.agente === run.agente);
        const primoNonErrore = diQuestoAgente.findIndex((r) => r.status !== "errore");
        const errori = primoNonErrore === -1 ? diQuestoAgente.length : primoNonErrore;
        const giaAvvisato = diQuestoAgente
          .slice(1, errori)
          .some((r) => r.avvisoInviato && Date.now() - new Date(r.timestamp).getTime() < 24 * 3600 * 1000);
        if (errori >= 2 && !giaAvvisato) {
          nuovo.avvisoInviato = true;
          avviso = `⚠️ ${run.agente} (${run.identita}) non riesce a lavorare: ${errori} errori di fila.\nUltimo: ${run.riepilogo}\n\nDettagli in dashboard → Panoramica.`;
        }
      }
      return attuale;
    },
    `chore(agenti): esito ${run.agente} [skip ci]`
  );
  if (avviso) await inviaMessaggioTelegram(avviso);
}
