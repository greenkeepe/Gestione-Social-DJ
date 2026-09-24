import { leggiDatiRepo } from "../../../lib/dataSource";
import type { SeoProposalsFile } from "../../../lib/types";
import { SeoProposalCard } from "../../../components/SeoProposalCard";

export const dynamic = "force-dynamic";

// Proposte di titolo/meta description generate settimanalmente dall'SEO
// Engine (vedi site/docs/seo-engine.md e site/scripts/seo/propose-fixes.ts)
// a partire dai dati reali di Search Console. Ogni proposta va rivista qui
// e applicata (o modificata e applicata, o scartata) a mano: nessuna arriva
// mai sul sito pubblico senza un click esplicito.
export default async function SeoPage() {
  const proposteFile = await leggiDatiRepo<SeoProposalsFile>("site/data/seo/seo-proposte.json").catch(
    (): SeoProposalsFile => ({ proposte: [] })
  );

  const inAttesa = proposteFile.proposte
    .filter((p) => p.status === "proposta")
    .sort((a, b) => new Date(b.creatoIl).getTime() - new Date(a.creatoIl).getTime());
  const decise = proposteFile.proposte
    .filter((p) => p.status !== "proposta")
    .sort((a, b) => new Date(b.decisoIl ?? b.creatoIl).getTime() - new Date(a.decisoIl ?? a.creatoIl).getTime());

  return (
    <div>
      <h2>SEO</h2>
      <p className="note">
        Ogni lunedì l&apos;SEO Engine legge i dati reali di Google Search Console (fortedj.it/admin/seo, sola lettura) e propone qui titolo/meta
        description alternativi per le pagine vicine alla prima pagina di Google ma con pochi clic. Nessuna proposta tocca mai il sito da sola: la
        rivedi, la correggi se vuoi, e solo con &quot;Applica&quot; viene scritta davvero e pubblicata al deploy successivo.
      </p>

      <h3>Da rivedere ({inAttesa.length})</h3>
      {inAttesa.length === 0 && (
        <p className="note">
          Nessuna proposta al momento — o non ci sono ancora opportunità con volume sufficiente su Search Console, o non ce n&apos;è
          una nuova dall&apos;ultimo giro settimanale.
        </p>
      )}
      {inAttesa.map((p) => (
        <SeoProposalCard key={p.id} proposta={p} />
      ))}

      {decise.length > 0 && (
        <>
          <h3>Decise di recente</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Pagina</th>
                  <th>Query</th>
                  <th>Stato</th>
                  <th>Quando</th>
                </tr>
              </thead>
              <tbody>
                {decise.map((p) => (
                  <tr key={p.id}>
                    <td>{p.pageLabel}</td>
                    <td>{p.query}</td>
                    <td>{p.status}</td>
                    <td>{new Date(p.decisoIl ?? p.creatoIl).toLocaleString("it-IT")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
