import { Upload } from "lucide-react";
import { leggiDati } from "../../../lib/dataSource";
import { UploadForm } from "../../../components/UploadForm";
import { DeleteButton } from "../../../components/DeleteButton";
import { PageHeader } from "../../../components/ui/PageHeader";
import { EmptyState } from "../../../components/ui/EmptyState";
import { LoadMore } from "../../../components/ui/LoadMore";

export const dynamic = "force-dynamic";

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

export default async function CaricaPage() {
  const libreria = await leggiDati<MediaLibraryFile>("media-library.json");
  const daUsare = libreria.items.filter((i) => i.usatoIl === null).reverse();
  const giaUsati = libreria.items.filter((i) => i.usatoIl !== null).reverse();

  return (
    <div>
      <PageHeader icon={<Upload size={22} aria-hidden="true" />} title="Carica media" />
      <UploadForm />

      <h3 className="mt-lg">In attesa di essere pubblicati ({daUsare.length})</h3>
      {daUsare.length === 0 && <EmptyState title="Nessun media in coda" description="Caricane uno qui sopra." />}
      <div className="grid">
        {daUsare.map((item) => (
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

      {giaUsati.length > 0 && (
        <>
          <h3>Già usati</h3>
          <table>
            <thead><tr><th>File</th><th>Caricato il</th><th>Usato il</th><th></th></tr></thead>
            <tbody>
              <LoadMore
                as="table"
                colSpan={4}
                initialCount={20}
                label="media"
                items={giaUsati.map((item) => (
                  <tr key={item.id}>
                    <td>{item.filename}</td>
                    <td>{new Date(item.uploadedAt).toLocaleDateString("it-IT")}</td>
                    <td>{item.usatoIl ? new Date(item.usatoIl).toLocaleDateString("it-IT") : "—"}</td>
                    <td><DeleteButton url={`/api/media/${item.id}`} conferma={`Eliminare "${item.filename}"? Il file viene rimosso anche da R2.`} /></td>
                  </tr>
                ))}
              />
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
