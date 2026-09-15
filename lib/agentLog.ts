// Ogni agente registra qui il proprio "diario di bordo": cosa ha fatto,
// quando, con quale esito. E' la fonte della sezione "Agenti" della dashboard.
import { readData, writeData, nowIso } from "./storage.js";

export type AgentRunStatus = "ok" | "errore" | "nessuna-azione";

export interface AgentRun {
  agente: string;
  identita: string;
  timestamp: string;
  status: AgentRunStatus;
  riepilogo: string;
  dettagli?: Record<string, unknown>;
}

interface AgentRunsFile {
  _istruzioni: string;
  runs: AgentRun[];
}

export async function logAgentRun(run: Omit<AgentRun, "timestamp">): Promise<void> {
  const file = await readData<AgentRunsFile>("agent-runs.json");
  file.runs.unshift({ ...run, timestamp: nowIso() });
  // teniamo solo le ultime 500 esecuzioni per non far crescere il file all'infinito
  file.runs = file.runs.slice(0, 500);
  await writeData("agent-runs.json", file);
}
