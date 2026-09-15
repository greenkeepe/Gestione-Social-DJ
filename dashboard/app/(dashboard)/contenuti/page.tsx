import { leggiDati } from "../../../lib/dataSource";
import type { PostsQueueFile, PublishedLogFile } from "../../../lib/types";

export const dynamic = "force-dynamic";

export default async function ContenutiPage() {
  const [queueFile, publishedFile] = await Promise.all([
    leggiDati<PostsQueueFile>("posts-queue.json"),
    leggiDati<PublishedLogFile>("published-log.json")
  ]);

  const inCoda = queueFile.queue.filter((q) => q.status !== "pubblicato");
  const pubblicati = publishedFile.log.slice(0, 20);

  return (
    <div>
      <h2>Contenuti</h2>

      <h3>In coda</h3>
      {inCoda.length === 0 && <p className="note">Nessun contenuto in coda al momento.</p>}
      <div className="grid">
        {inCoda.map((item) => (
          <div className="card" key={item.id}>
            <div className="label">{item.formato} — {item.status}</div>
            <p className="note">{item.media.filename}</p>
            {item.caption && <p>{item.caption}</p>}
            {item.orarioProgrammato && <p className="note">Programmato per le {item.orarioProgrammato}</p>}
          </div>
        ))}
      </div>

      <h3>Pubblicati di recente</h3>
      <table>
        <thead>
          <tr><th>Formato</th><th>Quando</th><th>Instagram</th><th>Facebook</th></tr>
        </thead>
        <tbody>
          {pubblicati.length === 0 && (
            <tr><td colSpan={4} className="note">Nessuna pubblicazione ancora registrata.</td></tr>
          )}
          {pubblicati.map((p, i) => (
            <tr key={i}>
              <td>{p.formato}</td>
              <td>{new Date(p.timestamp).toLocaleString("it-IT")}</td>
              <td>{p.instagramId}</td>
              <td>{p.facebookId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
