// Agente "Stratega" — tiene aggiornato l'avanzamento verso l'obiettivo dei
// 30 matrimoni 2027 (data/strategy-2027.json) confrontando i KPI correnti
// con le soglie attese di ogni fase, e segnala se si è in ritardo.
import "dotenv/config";
import { readData, writeData, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { IDENTITA } from "./identities.js";

interface StrategyFile {
  fasi: Array<{ id: string; nome: string }>;
  progresso: {
    ultimoAggiornamento: string | null;
    faseCorrente: string;
    matrimoniConfermati: number;
    leadInPipeline: number;
    partnershipAttive: number;
    note: string[];
  };
}

interface KpisFile {
  obiettivo2027: { matrimoniTarget: number; matrimoniConfermati: number; leadAttivi: number };
}

export async function eseguiStrategyAgent(): Promise<void> {
  try {
    const strategy = await readData<StrategyFile>("strategy-2027.json");
    const kpis = await readData<KpisFile>("kpis.json");

    strategy.progresso.matrimoniConfermati = kpis.obiettivo2027.matrimoniConfermati;
    strategy.progresso.leadInPipeline = kpis.obiettivo2027.leadAttivi;
    strategy.progresso.ultimoAggiornamento = nowIso();

    const percentuale = (strategy.progresso.matrimoniConfermati / kpis.obiettivo2027.matrimoniTarget) * 100;
    const nota = `Avanzamento: ${strategy.progresso.matrimoniConfermati}/${kpis.obiettivo2027.matrimoniTarget} matrimoni confermati (${percentuale.toFixed(1)}%), ${strategy.progresso.leadInPipeline} lead in pipeline.`;

    strategy.progresso.note.unshift(nota);
    strategy.progresso.note = strategy.progresso.note.slice(0, 50);

    await writeData("strategy-2027.json", strategy);

    await logAgentRun({
      agente: IDENTITA.strategy.nome,
      identita: IDENTITA.strategy.ruolo,
      status: "ok",
      riepilogo: nota
    });
  } catch (err) {
    await logAgentRun({
      agente: IDENTITA.strategy.nome,
      identita: IDENTITA.strategy.ruolo,
      status: "errore",
      riepilogo: "Errore imprevisto nell'Agente Strategia.",
      dettagli: { errore: String(err) }
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiStrategyAgent();
}
