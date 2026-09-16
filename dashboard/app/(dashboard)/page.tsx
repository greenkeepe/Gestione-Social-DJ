import { leggiDati } from "../../lib/dataSource";
import type { KpisFile, AgentRunsFile, StrategyFile, PostsQueueFile, PublishedLogFile, ReelJobsFile } from "../../lib/types";

export const dynamic = "force-dynamic";

interface MediaLibraryFile {
  items: Array<{ usatoIl: string | null; source?: string }>;
}

export default async function Panoramica() {
  const [kpis, agentRuns, strategy, media, queueFile, publishedFile, reelJobs] = await Promise.all([
    leggiDati<KpisFile>("kpis.json"),
    leggiDati<AgentRunsFile>("agent-runs.json"),
    leggiDati<StrategyFile>("strategy-2027.json"),
    leggiDati<MediaLibraryFile>("media-library.json"),
    leggiDati<PostsQueueFile>("posts-queue.json"),
    leggiDati<PublishedLogFile>("published-log.json"),
    leggiDati<ReelJobsFile>("reel-jobs.json")
  ]);

  const percentuale = Math.min(
    100,
    Math.round((kpis.obiettivo2027.matrimoniConfermati / kpis.obiettivo2027.matrimoniTarget) * 100)
  );
  const ultimeAzioni = agentRuns.runs.slice(0, 8);

  // Visione globale: tutto quello che sta succedendo nella pipeline, dal
  // media grezzo alla pubblicazione, in un solo colpo d'occhio.
  const mediaInAttesa = media.items.filter((m) => m.usatoIl === null).length;
  const reelInElaborazione = reelJobs.jobs.filter((j) => j.status === "in-coda-analisi").length;
  const inPausaOErrore = queueFile.queue.filter((q) => q.status.startsWith("in-pausa") || q.status === "errore").length;
  const inCoda = queueFile.queue.filter((q) => q.status !== "pubblicato" && q.status !== "pubblicato-parziale").length;
  const ultimoPubblicato = publishedFile.log[0] ?? null;

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

      <h3>Pipeline contenuti — visione globale</h3>
      <div className="grid">
        <div className="card">
          <div className="label">Media in attesa (foto/video da caricare)</div>
          <div className="value">{mediaInAttesa}</div>
        </div>
        <div className="card">
          <div className="label">Reel in montaggio AI</div>
          <div className="value">{reelInElaborazione}</div>
        </div>
        <div className="card">
          <div className="label">Contenuti in coda (tutti gli stati)</div>
          <div className="value">{inCoda}</div>
        </div>
        <div className="card">
          <div className="label">In pausa / in errore (richiedono attenzione)</div>
          <div className="value">{inPausaOErrore}</div>
        </div>
      </div>
      <p className="note">
        Ultima pubblicazione:{" "}
        {ultimoPubblicato
          ? `${ultimoPubblicato.formato} il ${new Date(ultimoPubblicato.timestamp).toLocaleString("it-IT")}`
          : "nessuna ancora"}
        . Dettagli completi nella pagina{" "}
        <a href="/contenuti">Contenuti</a>, media grezzi in <a href="/carica">Carica media</a> e <a href="/reel-ai">Crea Reel AI</a>.
      </p>

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
