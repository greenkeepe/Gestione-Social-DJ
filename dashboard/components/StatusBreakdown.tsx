// Riepilogo visivo degli esiti delle esecuzioni agente: una barra impilata
// (proporzionale ai conteggi) più una legenda con i totali per stato.
// Riceve solo la lista di run già caricata dalla pagina — nessun fetch qui.
interface RunLike {
  status: string;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  ok: { label: "OK", color: "var(--color-ok)" },
  errore: { label: "Errore", color: "var(--color-err)" },
  "nessuna-azione": { label: "Nessuna azione", color: "var(--text-dim)" }
};

const ORDINE = ["ok", "errore", "nessuna-azione"];

export function StatusBreakdown({ runs }: { runs: RunLike[] }) {
  const totale = runs.length;
  const conteggi: Record<string, number> = {};
  for (const r of runs) {
    conteggi[r.status] = (conteggi[r.status] ?? 0) + 1;
  }

  const extra = Object.keys(conteggi).filter((s) => !ORDINE.includes(s));
  const stati = [...ORDINE, ...extra].filter((s) => conteggi[s] > 0);

  return (
    <div className="status-breakdown">
      <div className="status-breakdown__bar">
        {totale === 0 ? (
          <div className="status-breakdown__empty" />
        ) : (
          stati.map((s) => (
            <div
              key={s}
              className="status-breakdown__segment"
              style={{ width: `${(conteggi[s] / totale) * 100}%`, background: STATUS_META[s]?.color ?? "var(--text-dim)" }}
              title={`${STATUS_META[s]?.label ?? s}: ${conteggi[s]}`}
            />
          ))
        )}
      </div>
      <div className="status-breakdown__legend">
        {totale === 0 && <span>Nessuna esecuzione registrata ancora.</span>}
        {stati.map((s) => (
          <span className="status-breakdown__legend-item" key={s}>
            <span className="status-breakdown__dot" style={{ background: STATUS_META[s]?.color ?? "var(--text-dim)" }} />
            {STATUS_META[s]?.label ?? s} <strong>{conteggi[s]}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
