import { Upload } from "lucide-react";
import { leggiDati } from "../../../lib/dataSource";
import { UploadForm } from "../../../components/UploadForm";
import { DeleteButton } from "../../../components/DeleteButton";
import { ReelJobActions } from "../../../components/ReelJobActions";
import { PageHeader } from "../../../components/ui/PageHeader";
import { EmptyState } from "../../../components/ui/EmptyState";
import { LoadMore } from "../../../components/ui/LoadMore";
import type { ReelJobsFile } from "../../../lib/types";

export const dynamic = "force-dynamic";

// Unica pagina per caricare foto e video (prima c'erano "Carica media" e
// "Crea Reel AI"): le foto finiscono in data/media-library.json, i video in
// data/reel-jobs.json e li monta Regia. Qui sotto: video in montaggio o
// pronti, foto in attesa, e lo storico di quello già usato.

interface MediaLibraryItem {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  uploadedAt: string;
  usatoIl: string | null;
}

interface MediaLibraryFile {
  items: MediaLibraryItem[];
}

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
  "in-coda-analisi": "in montaggio",
  pronto: "pronto",
  errore: "errore",
  usato: "usato in un post"
};

export default async function CaricaPage() {
  const [libreria, jobsFile] = await Promise.all([
    leggiDati<MediaLibraryFile>("media-library.json"),
    leggiDati<ReelJobsFile>("reel-jobs.json")
  ]);
  const fotoInAttesa = libreria.items.filter((i) => i.usatoIl === null).reverse();
  const fotoUsate = libreria.items.filter((i) => i.usatoIl !== null).reverse();
  const jobs = [...jobsFile.jobs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const videoAttivi = jobs.filter((j) => j.status !== "usato");
  const videoUsati = jobs.filter((j) => j.status === "usato");

  return (
    <div>
      <PageHeader
        icon={<Upload size={22} aria-hidden="true" />}
        title="Carica"
        description="Carica foto e video degli eventi: Regia li trasforma in Reel, l'AI scrive la didascalia e li trovi in Anteprima, già programmati. Non serve restare sulla pagina durante il montaggio."
      />
      <UploadForm />

      <h3 className="mt-lg">Video in montaggio o pronti ({videoAttivi.length})</h3>
      {videoAttivi.length === 0 && <EmptyState title="Nessun video in lavorazione" description="I video caricati compaiono qui mentre Regia li monta." />}
      <div className="grid reel-jobs-grid">
        {videoAttivi.map((job) => (
          <div className="card" key={job.id}>
            <div className="flex-between">
              <div className="label">{job.filename}</div>
              <span className={`ig-post__badge ${job.status}`}>{STATUS_LABEL[job.status] ?? job.status}</span>
            </div>
            <p className="note">
              Stile: {job.profilo} · Caricato il {new Date(job.createdAt).toLocaleString("it-IT")}
            </p>
            {job.status === "in-coda-analisi" && <p className="note">Passo corrente: {STEP_LABEL[job.step] ?? job.step}…</p>}
            {job.status === "errore" && <p className="error-msg">{job.erroreMessaggio ?? "Errore sconosciuto."}</p>}
            {job.status === "pronto" && job.risultato && (
              <>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video className="ig-post__media reel" src={job.risultato.reelUrl} controls muted style={{ borderRadius: 8, marginTop: 8 }} />
                <p className="note">{job.risultato.durataSecondi.toFixed(0)}s</p>
              </>
            )}
            <div className="flex flex-wrap gap-sm mt-sm">
              <ReelJobActions jobId={job.id} pronto={job.status === "pronto"} />
              <DeleteButton url={`/api/reel-jobs/${job.id}`} conferma={`Eliminare "${job.filename}"? Vengono rimossi anche i file video da R2.`} />
            </div>
          </div>
        ))}
      </div>

      <h3 className="mt-lg">Foto in attesa ({fotoInAttesa.length})</h3>
      {fotoInAttesa.length === 0 && <EmptyState title="Nessuna foto in attesa" description="Le foto caricate compaiono qui finché non diventano un contenuto." />}
      <div className="grid">
        {fotoInAttesa.map((item) => (
          <div className="card" key={item.id}>
            {item.mimeType.startsWith("video/") ? (
              <video className="media-thumb" src={item.url} muted />
            ) : (
              <img className="media-thumb" src={item.url} alt={item.filename} />
            )}
            <p className="note">{item.filename}</p>
            <DeleteButton url={`/api/media/${item.id}`} conferma={`Eliminare "${item.filename}"? Il file viene rimosso anche da R2.`} />
          </div>
        ))}
      </div>

      {(fotoUsate.length > 0 || videoUsati.length > 0) && (
        <>
          <h3>Già usati ({fotoUsate.length + videoUsati.length})</h3>
          <table>
            <thead>
              <tr><th>File</th><th>Tipo</th><th>Caricato il</th><th></th></tr>
            </thead>
            <tbody>
              <LoadMore
                as="table"
                colSpan={4}
                initialCount={10}
                label="file"
                items={[
                  ...videoUsati.map((job) => ({
                    quando: job.createdAt,
                    riga: (
                      <tr key={`v-${job.id}`}>
                        <td>
                          {job.risultato ? <a href={job.risultato.reelUrl} target="_blank" rel="noreferrer">{job.filename}</a> : job.filename}
                        </td>
                        <td>Video</td>
                        <td>{new Date(job.createdAt).toLocaleDateString("it-IT")}</td>
                        <td><DeleteButton url={`/api/reel-jobs/${job.id}`} conferma={`Eliminare "${job.filename}"? Vengono rimossi anche i file video da R2.`} /></td>
                      </tr>
                    )
                  })),
                  ...fotoUsate.map((item) => ({
                    quando: item.uploadedAt,
                    riga: (
                      <tr key={`f-${item.id}`}>
                        <td>{item.filename}</td>
                        <td>Foto</td>
                        <td>{new Date(item.uploadedAt).toLocaleDateString("it-IT")}</td>
                        <td><DeleteButton url={`/api/media/${item.id}`} conferma={`Eliminare "${item.filename}"? Il file viene rimosso anche da R2.`} /></td>
                      </tr>
                    )
                  }))
                ]
                  .sort((a, b) => (a.quando < b.quando ? 1 : -1))
                  .map((x) => x.riga)}
              />
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
