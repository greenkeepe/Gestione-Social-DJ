import { leggiDati } from "../../../lib/dataSource";
import { UploadForm } from "../../../components/UploadForm";

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
      <h2>Carica media</h2>
      <UploadForm />

      <h3>In attesa di essere pubblicati ({daUsare.length})</h3>
      {daUsare.length === 0 && <p className="note">Nessun media in coda: caricane uno qui sopra.</p>}
      <div className="grid">
        {daUsare.map((item) => (
          <div className="card" key={item.id}>
            {item.mimeType.startsWith("video/") ? (
              <video className="media-thumb" src={item.url} muted />
            ) : (
              <img className="media-thumb" src={item.url} alt={item.filename} />
            )}
            <p className="note">{item.filename}</p>
          </div>
        ))}
      </div>

      {giaUsati.length > 0 && (
        <>
          <h3>Già usati</h3>
          <table>
            <thead><tr><th>File</th><th>Caricato il</th><th>Usato il</th></tr></thead>
            <tbody>
              {giaUsati.slice(0, 20).map((item) => (
                <tr key={item.id}>
                  <td>{item.filename}</td>
                  <td>{new Date(item.uploadedAt).toLocaleDateString("it-IT")}</td>
                  <td>{item.usatoIl ? new Date(item.usatoIl).toLocaleDateString("it-IT") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
