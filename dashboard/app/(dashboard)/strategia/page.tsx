import { leggiDati } from "../../../lib/dataSource";
import type { StrategyFile } from "../../../lib/types";

export const dynamic = "force-dynamic";

export default async function StrategiaPage() {
  const strategy = await leggiDati<StrategyFile>("strategy-2027.json");

  return (
    <div>
      <h2>Strategia 2027</h2>
      <p><strong>Obiettivo:</strong> {strategy.obiettivo}</p>
      <p className="note">{strategy.logicaTemporale}</p>

      <h3>Fasi del piano</h3>
      {strategy.fasi.map((fase) => (
        <div className="card" key={fase.id} style={{ marginBottom: 12 }}>
          <div className="label">{fase.nome} — {fase.periodo}</div>
          <ul>
            {fase.obiettivi.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </div>
      ))}

      <h3>Canali di acquisizione</h3>
      <div className="pill-list">
        {strategy.canaliAcquisizione.map((c, i) => <span className="pill" key={i}>{c}</span>)}
      </div>

      <h3>Note di avanzamento</h3>
      <ul>
        {strategy.progresso.note.length === 0 && <li className="note">Nessuna nota ancora.</li>}
        {strategy.progresso.note.slice(0, 15).map((n, i) => <li key={i} className="note">{n}</li>)}
      </ul>

      <p className="note">
        Il piano marketing completo, con idee di contenuti, partnership e calendario stagionale, è in{" "}
        <code>docs/strategia-marketing-2027.md</code> nel repository.
      </p>
    </div>
  );
}
