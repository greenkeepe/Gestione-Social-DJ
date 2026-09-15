import { leggiDati } from "../../lib/dataSource";
import type { KpisFile, AgentRunsFile, StrategyFile } from "../../lib/types";

export const dynamic = "force-dynamic";

export default async function Panoramica() {
  const [kpis, agentRuns, strategy] = await Promise.all([
    leggiDati<KpisFile>("kpis.json"),
    leggiDati<AgentRunsFile>("agent-runs.json"),
    leggiDati<StrategyFile>("strategy-2027.json")
  ]);

  const percentuale = Math.min(
    100,
    Math.round((kpis.obiettivo2027.matrimoniConfermati / kpis.obiettivo2027.matrimoniTarget) * 100)
  );
  const ultimeAzioni = agentRuns.runs.slice(0, 8);

  return (
    <div>
      <h2>Panoramica</h2>
      <p className="note">
        Ultimo aggiornamento dati: {kpis.ultimoAggiornamento ? new Date(kpis.ultimoAggiornamento).toLocaleString("it-IT") : "in attesa del primo ciclo agenti"}
      </p>

      <div className="grid">
        <div className="card">
          <div className="label">Follower Instagram</div>
          <div className="value">{kpis.instagram.followers ?? "—"}</div>
        </div>
        <div className="card">
          <div className="label">Follower Facebook</div>
          <div className="value">{kpis.facebook.followers ?? "—"}</div>
        </div>
        <div className="card">
          <div className="label">Lead attivi</div>
          <div className="value">{kpis.obiettivo2027.leadAttivi}</div>
        </div>
        <div className="card">
          <div className="label">Matrimoni confermati 2027</div>
          <div className="value">{kpis.obiettivo2027.matrimoniConfermati} / {kpis.obiettivo2027.matrimoniTarget}</div>
        </div>
      </div>

      <div className="card">
        <div className="label">Obiettivo: {strategy.obiettivo}</div>
        <div className="progress-bar">
          <div style={{ width: `${percentuale}%` }} />
        </div>
        <p className="note">{percentuale}% completato — fase corrente: {strategy.progresso.faseCorrente}</p>
      </div>

      <h3>Ultime azioni degli agenti</h3>
      <table>
        <thead>
          <tr><th>Agente</th><th>Esito</th><th>Riepilogo</th><th>Quando</th></tr>
        </thead>
        <tbody>
          {ultimeAzioni.length === 0 && (
            <tr><td colSpan={4} className="note">Nessuna esecuzione ancora registrata. Gli agenti partiranno al primo ciclo pianificato (o lanciali manualmente da GitHub Actions).</td></tr>
          )}
          {ultimeAzioni.map((r, i) => (
            <tr key={i}>
              <td>{r.agente}</td>
              <td><span className={`badge ${r.status}`}>{r.status}</span></td>
              <td>{r.riepilogo}</td>
              <td>{new Date(r.timestamp).toLocaleString("it-IT")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
