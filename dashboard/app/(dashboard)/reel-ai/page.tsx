import { leggiDati } from "../../../lib/dataSource";
import { ReelUploadForm } from "../../../components/ReelUploadForm";
import { ReelJobActions } from "../../../components/ReelJobActions";
import { DeleteButton } from "../../../components/DeleteButton";
import type { ReelJobsFile } from "../../../lib/types";

export const dynamic = "force-dynamic";

const STEP_LABEL: Record<string, string> = {
  "in-coda": "in attesa di elaborazione",
  analisi: "analisi del video",
  piano: "scelta dei momenti migliori",
  montaggio: "montaggio",
  "verifica-qualita": "controllo qualità",
  caricamento: "caricamento del risultato",
  completato: "completato"
};

const STATUS_LABEL: Record<string, string> = {
  "in-coda-analisi": "in coda",
  pronto: "pronto",
  errore: "errore",
  usato: "usato in un post"
};

export default async function ReelAiPage() {
  const jobsFile = await leggiDati<ReelJobsFile>("reel-jobs.json");
  const jobs = [...jobsFile.jobs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div>
      <h2>🎬 Crea Reel AI</h2>
      <p className="note">
        Carica un video grezzo: il Regista parte subito, lo analizza, sceglie i momenti migliori e monta un Reel verticale (9:16). Appena pronto entra
        da solo nella pipeline di pubblicazione (didascalia scritta dall&apos;AI, pubblicato nell&apos;orario migliore) — non serve nessuna conferma manuale.
        Questa pagina non richiede di restare aperta durante l&apos;elaborazione.
      </p>

      <ReelUploadForm />

      <h3>Video in coda / elaborati ({jobs.length})</h3>
      {jobs.length === 0 && <p className="note">Nessun video ancora caricato.</p>}

      <div className="grid reel-jobs-grid">
        {jobs.map((job) => (
          <div className="card" key={job.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="label">{job.filename}</div>
              <span className={`ig-post__badge ${job.status}`}>{STATUS_LABEL[job.status] ?? job.status}</span>
            </div>
            <p className="note">
              Profilo: {job.profilo} · Caricato il {new Date(job.createdAt).toLocaleString("it-IT")}
            </p>

            {job.status === "in-coda-analisi" && (
              <p className="note">Passo corrente: {STEP_LABEL[job.step] ?? job.step}…</p>
            )}

            {job.status === "errore" && (
              <p className="error-msg">{job.erroreMessaggio ?? "Errore sconosciuto."}</p>
            )}

            {(job.status === "pronto" || job.status === "usato") && job.risultato && (
              <>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video className="ig-post__media reel" src={job.risultato.reelUrl} controls muted style={{ borderRadius: 8, marginTop: 8 }} />
                <p className="note">
                  {job.risultato.piano.categoria} · stile {job.risultato.piano.stile} · {job.risultato.durataSecondi.toFixed(0)}s
                </p>
              </>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {job.status !== "usato" && <ReelJobActions jobId={job.id} pronto={job.status === "pronto"} />}
              <DeleteButton url={`/api/reel-jobs/${job.id}`} conferma={`Eliminare "${job.filename}"? Vengono rimossi anche i file video da R2.`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
