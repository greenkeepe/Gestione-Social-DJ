import { leggiDatiRepo } from "../../../lib/dataSource";
import type {
  SeoProposalsFile,
  GscDataFile,
  OpportunitiesFile,
  InternalLinksFile,
  IndexingFile
} from "../../../lib/types";
import { SeoProposalCard } from "../../../components/SeoProposalCard";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ORPHAN: "orfana (nessun link)",
  POCO_COLLEGATA: "poco collegata",
  OK: "ok"
};

// Tutto quello che serve per la SEO in un solo posto, così non serve più
// aprire separatamente fortedj.it/admin/seo: dati grezzi di Search Console,
// opportunità rilevate, internal linking, indicizzazione (tutti di sola
// lettura, generati settimanalmente da site/scripts/seo/, vedi
// site/docs/seo-engine.md) e le proposte di titolo/meta description, le
// uniche su cui si agisce davvero da qui (Applica/Scarta).
export default async function SeoPage() {
  const [proposteFile, gscData, opportunitiesFile, internalLinksFile, indexingFile] = await Promise.all([
    leggiDatiRepo<SeoProposalsFile>("site/data/seo/seo-proposte.json").catch((): SeoProposalsFile => ({ proposte: [] })),
    leggiDatiRepo<GscDataFile>("site/data/seo/gsc-data.json").catch(
      (): GscDataFile => ({ generatedAt: null, period: null, totals: { clicks: 0, impressions: 0 }, byQueryPage: [] })
    ),
    leggiDatiRepo<OpportunitiesFile>("site/data/seo/opportunities.json").catch(
      (): OpportunitiesFile => ({ generatedAt: null, sourceGeneratedAt: null, opportunities: [] })
    ),
    leggiDatiRepo<InternalLinksFile>("site/data/seo/internal-links.json").catch(
      (): InternalLinksFile => ({ generatedAt: null, note: "", routes: [] })
    ),
    leggiDatiRepo<IndexingFile>("site/data/seo/indexing.json").catch((): IndexingFile => ({ generatedAt: null, siteUrl: null, rows: [] }))
  ]);

  const inAttesa = proposteFile.proposte
    .filter((p) => p.status === "proposta")
    .sort((a, b) => new Date(b.creatoIl).getTime() - new Date(a.creatoIl).getTime());
  const decise = proposteFile.proposte
    .filter((p) => p.status !== "proposta")
    .sort((a, b) => new Date(b.decisoIl ?? b.creatoIl).getTime() - new Date(a.decisoIl ?? a.creatoIl).getTime());

  const topQuery = [...gscData.byQueryPage].sort((a, b) => b.impressions - a.impressions).slice(0, 15);
  const problemi = internalLinksFile.routes.filter((r) => r.status !== "OK");

  return (
    <div>
      <h2>SEO</h2>
      <p className="note">
        Tutto quello che serve per la SEO in un solo posto: dati reali di Google Search Console, opportunità rilevate, stato dell&apos;internal
        linking e dell&apos;indicizzazione (aggiornati ogni lunedì), e le proposte di titolo/meta description da rivedere e applicare. Nessun dato
        qui sotto tocca mai il sito da solo, tranne quando premi esplicitamente &quot;Applica&quot; su una proposta.
      </p>

      <h3>Riepilogo Search Console</h3>
      {gscData.generatedAt ? (
        <>
          <div className="grid">
            <div className="card card--stat">
              <div className="stat-top">
                <div className="label">Clic (ultimi 28 giorni)</div>
                <span className="stat-icon" aria-hidden="true">🖱️</span>
              </div>
              <div className="value">{gscData.totals.clicks}</div>
            </div>
            <div className="card card--stat">
              <div className="stat-top">
                <div className="label">Impression</div>
                <span className="stat-icon" aria-hidden="true">👁️</span>
              </div>
              <div className="value">{gscData.totals.impressions}</div>
            </div>
          </div>
          <p className="note">
            Periodo: {gscData.period ? `${gscData.period.startDate} → ${gscData.period.endDate}` : "n/d"}. Ultimo aggiornamento:{" "}
            {new Date(gscData.generatedAt).toLocaleString("it-IT")}.
          </p>
          {topQuery.length > 0 && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Query</th>
                    <th>Pagina</th>
                    <th>Clic</th>
                    <th>Impression</th>
                    <th>Posizione media</th>
                  </tr>
                </thead>
                <tbody>
                  {topQuery.map((row, i) => (
                    <tr key={i}>
                      <td>{row.keys[0]}</td>
                      <td>{row.keys[1]}</td>
                      <td>{row.clicks}</td>
                      <td>{row.impressions}</td>
                      <td>{row.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <p className="note">Nessuna sincronizzazione con Search Console ancora eseguita (o credenziali GSC non configurate).</p>
      )}

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

      <h3>Tutte le opportunità rilevate ({opportunitiesFile.opportunities.length})</h3>
      <p className="note">
        Query in posizione 5-20 con CTR basso rispetto a quella fascia (vedi site/docs/seo-engine.md per le soglie esatte). Non tutte hanno
        ancora una proposta di titolo/meta qui sopra — propose-fixes.ts ne genera una alla volta per pagina.
      </p>
      {opportunitiesFile.opportunities.length === 0 ? (
        <p className="note">Nessuna opportunità rilevata (traffico ancora troppo basso, o dati non ancora sincronizzati).</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Query</th>
                <th>Pagina</th>
                <th>Posizione</th>
                <th>Impression</th>
                <th>CTR</th>
                <th>Priorità</th>
              </tr>
            </thead>
            <tbody>
              {opportunitiesFile.opportunities.map((o, i) => (
                <tr key={i}>
                  <td>{o.query}</td>
                  <td>{o.page}</td>
                  <td>{o.position.toFixed(1)}</td>
                  <td>{o.impressions}</td>
                  <td>{(o.ctr * 100).toFixed(1)}%</td>
                  <td>
                    <span className={`badge ${o.priority === "HIGH" ? "errore" : o.priority === "MEDIUM" ? "ok" : "nessuna-azione"}`}>
                      {o.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>Internal linking</h3>
      {internalLinksFile.routes.length === 0 ? (
        <p className="note">Nessun controllo ancora eseguito.</p>
      ) : problemi.length === 0 ? (
        <p className="note">Tutte le {internalLinksFile.routes.length} pagine sono collegate a sufficienza da link interni.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Pagina</th>
                <th>Link interni in entrata</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {problemi.map((r) => (
                <tr key={r.path}>
                  <td>{r.label}</td>
                  <td>{r.inboundContextualLinks}</td>
                  <td>
                    <span className={`badge ${r.status === "ORPHAN" ? "errore" : "nessuna-azione"}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>Indicizzazione</h3>
      {indexingFile.rows.length === 0 ? (
        <p className="note">Nessun controllo ancora eseguito (richiede le credenziali Search Console).</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Stato</th>
                <th>Ultima scansione</th>
              </tr>
            </thead>
            <tbody>
              {indexingFile.rows.map((r) => (
                <tr key={r.url}>
                  <td>{r.url}</td>
                  <td>{r.verdict ?? r.coverageState ?? r.indexingState ?? (r.error ? `errore: ${r.error}` : "n/d")}</td>
                  <td>{r.lastCrawlTime ? new Date(r.lastCrawlTime).toLocaleDateString("it-IT") : "mai scansionata"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {decise.length > 0 && (
        <>
          <h3>Proposte decise di recente</h3>
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
