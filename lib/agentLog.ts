// Ogni agente registra qui il proprio "diario di bordo": cosa ha fatto,
// quando, con quale esito. E' la fonte della sezione "Agenti" della dashboard.
import { readData, writeData, nowIso } from "./storage.js";
import { inviaMessaggioTelegram } from "./telegram.js";

export type AgentRunStatus = "ok" | "errore" | "nessuna-azione";

export interface AgentRun {
  agente: string;
  identita: string;
  timestamp: string;
  status: AgentRunStatus;
  riepilogo: string;
  dettagli?: Record<string, unknown>;
  avvisoInviato?: boolean;
}

interface AgentRunsFile {
  _istruzioni: string;
  runs: AgentRun[];
}

// Avviso su Telegram quando un agente fallisce 2 volte di fila (un errore
// isolato di rete si risolve spesso da solo al giro dopo). Al massimo un
// avviso al giorno per agente, finché non torna a funzionare. Nato dopo che
// la ricerca locali è fallita per una settimana senza che nessuno lo vedesse.
const ERRORI_DI_FILA_PER_AVVISO = 2;

export async function logAgentRun(run: Omit<AgentRun, "timestamp">): Promise<void> {
  const file = await readData<AgentRunsFile>("agent-runs.json");
  const nuovo: AgentRun = { ...run, timestamp: nowIso() };
  file.runs.unshift(nuovo);
  // teniamo solo le ultime 500 esecuzioni per non far crescere il file all'infinito
  file.runs = file.runs.slice(0, 500);

  let avviso: string | null = null;
  if (run.status === "errore") {
    const diQuestoAgente = file.runs.filter((r) => r.agente === run.agente);
    const diFila = diQuestoAgente.findIndex((r) => r.status !== "errore");
    const errori = diFila === -1 ? diQuestoAgente.length : diFila;
    const giaAvvisato = diQuestoAgente
      .slice(1, errori)
      .some((r) => r.avvisoInviato && Date.now() - new Date(r.timestamp).getTime() < 24 * 3600 * 1000);
    if (errori >= ERRORI_DI_FILA_PER_AVVISO && !giaAvvisato) {
      nuovo.avvisoInviato = true;
      avviso = `⚠️ ${run.agente} (${run.identita}) non riesce a lavorare: ${errori} errori di fila.\nUltimo: ${run.riepilogo}\n\nDettagli in dashboard → Panoramica.`;
    }
  }
  await writeData("agent-runs.json", file);
  if (avviso) await inviaMessaggioTelegram(avviso);
}
