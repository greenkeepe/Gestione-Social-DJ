import { leggiDati } from "../../../lib/dataSource";
import type { StrategyFile, KpisFile } from "../../../lib/types";
import { ProgressRing } from "../../../components/ProgressRing";

export const dynamic = "force-dynamic";

export default async function StrategiaPage() {
  const [strategy, kpis] = await Promise.all([
    leggiDati<StrategyFile>("strategy-2027.json"),
    leggiDati<KpisFile>("kpis.json")
  ]);

  const target = kpis.obiettivo2027.matrimoniTarget;
  const confermati = strategy.progresso.matrimoniConfermati;
  const percentuale = target > 0 ? Math.min(100, Math.round((confermati / target) * 100)) : 0;

  return (
    <div>
      <h2>Strategia 2027</h2>
      <p><strong>Obiettivo:</strong> {strategy.obiettivo}</p>
      <p className="note">{strategy.logicaTemporale}</p>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="stat-with-ring">
          <ProgressRing percentage={percentuale} color="var(--color-accent)" sublabel={`${confermati} / ${target}`} />
          <div className="stat-with-ring__details">
            <div className="label">Matrimoni confermati verso l&apos;obiettivo 2027</div>
            <div className="progress-bar">
              <div style={{ width: `${percentuale}%` }} />
            </div>
            <p className="note">
              {confermati} confermati su {target} target ({percentuale}%) — fase corrente: {strategy.progresso.faseCorrente}.{" "}
              Lead in pipeline: {strategy.progresso.leadInPipeline} · Partnership attive: {strategy.progresso.partnershipAttive}
            </p>
          </div>
        </div>
      </div>

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
