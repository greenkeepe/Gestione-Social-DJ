import { leggiDati } from "../../../lib/dataSource";
import type { AgentRunsFile } from "../../../lib/types";
import { StatusBreakdown } from "../../../components/StatusBreakdown";

export const dynamic = "force-dynamic";

const IDENTITA_DESCRIZIONI: Record<string, string> = {
  Direttore: "Agente Master: coordina tutti gli altri agenti ogni giorno nell'ordine corretto.",
  Occhio: "Agente Media: sceglie il prossimo file caricato dalla pagina \"Carica media\", preferendo un video (Reel) quando disponibile.",
  Copy: "Agente Contenuti: scrive didascalia e hashtag, imparando dai post già pubblicati quali pilastri/hashtag funzionano meglio.",
  Editore: "Agente Pubblicazione: pubblica su Instagram/Facebook nell'orario migliore della giornata.",
  Cacciatore: "Agente Lead: individua chi ha interagito con i contenuti e prepara bozze di messaggi privati (mai invio automatico).",
  Portavoce: "Agente Risposte Pubbliche: risponde in fretta ai nuovi commenti sotto gli ultimi post (mai in privato, mai prezzi/disponibilità).",
  Analista: "Agente Analytics: raccoglie le metriche, aggiorna i KPI e misura il punteggio reale dei post pubblicati.",
  Stratega: "Agente Strategia: aggiorna l'avanzamento verso i 30 matrimoni 2027.",
  Regista: "Agente AI Reel Maker: trasforma un video grezzo caricato dalla pagina \"Crea Reel AI\" in un Reel verticale montato e verificato.",
  Appunti: "Agente Note Instagram: propone ogni tanto su Telegram il testo di una Nota (max 60 caratteri) da incollare a mano.",
  Esploratore: "Agente Partnership Locali: trova ogni giorno fino a 10 ristoranti/hotel della zona e prepara bozze di email (mai invio automatico)."
};

export default async function AgentiPage() {
  const agentRuns = await leggiDati<AgentRunsFile>("agent-runs.json");

  const perAgente = new Map<string, typeof agentRuns.runs>();
  for (const run of agentRuns.runs) {
    const arr = perAgente.get(run.agente) ?? [];
    arr.push(run);
    perAgente.set(run.agente, arr);
  }

  return (
    <div>
      <h2>Agenti</h2>
      <p className="note">Ogni agente ha un ruolo specifico ed è coordinato quotidianamente dal Direttore (Agente Master).</p>

      <h3 style={{ marginTop: 12 }}>Esiti complessivi</h3>
      <StatusBreakdown runs={agentRuns.runs} />

      <h3>Ogni agente</h3>
      <div className="grid">
        {Object.entries(IDENTITA_DESCRIZIONI).map(([nome, descrizione]) => {
          const runs = perAgente.get(nome) ?? [];
          const ultimo = runs[0];
          return (
            <div className="card" key={nome}>
              <div className="label">{nome}</div>
              <p className="note" style={{ minHeight: 48 }}>{descrizione}</p>
              {ultimo ? (
                <>
                  <span className={`badge ${ultimo.status}`}>{ultimo.status}</span>
                  <p className="note">{ultimo.riepilogo}</p>
                  <p className="note">{new Date(ultimo.timestamp).toLocaleString("it-IT")}</p>
                </>
              ) : (
                <p className="note">Nessuna esecuzione ancora registrata.</p>
              )}
            </div>
          );
        })}
      </div>

      <h3>Log completo esecuzioni</h3>
      <table>
        <thead>
          <tr><th>Agente</th><th>Esito</th><th>Riepilogo</th><th>Quando</th></tr>
        </thead>
        <tbody>
          {agentRuns.runs.map((r, i) => (
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
