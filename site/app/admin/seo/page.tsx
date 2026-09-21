import type { Metadata } from "next";
import gscDataRaw from "@/data/seo/gsc-data.json";
import opportunitiesRaw from "@/data/seo/opportunities.json";
import internalLinksRaw from "@/data/seo/internal-links.json";
import { siteRoutes } from "@/data/routes";
import type { GscDataFile, OpportunitiesFile, InternalLinksFile } from "@/lib/seoEngineTypes";

// Pagina puramente di lettura: i dati sono generati da scripts/seo/ (vedi
// site/docs/seo-engine.md) e committati come JSON, quindi ogni nuovo deploy
// li mostra automaticamente. Protetta da Basic Auth via proxy.ts.
export const metadata: Metadata = {
  title: "SEO Engine — area riservata",
  robots: { index: false, follow: false },
};

// I placeholder JSON committati nel repo hanno campi vuoti/null (es. array
// `[]`, `positionRange: number[]` invece della tupla): il tipo reale è
// garantito dagli script che li generano (seoEngineTypes.ts), quindi qui
// serve un doppio cast invece di un'interfaccia che TypeScript possa
// verificare in modo esatto contro un JSON letterale.
const gscData = gscDataRaw as unknown as GscDataFile;
const opportunitiesData = opportunitiesRaw as unknown as OpportunitiesFile;
const internalLinksData = internalLinksRaw as unknown as InternalLinksFile;

function formatDate(iso: string | null): string {
  if (!iso) return "mai";
  return new Date(iso).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" });
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

const priorityStyles: Record<string, string> = {
  HIGH: "bg-red-500/20 text-red-300 border-red-500/40",
  MEDIUM: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  LOW: "bg-slate-500/20 text-slate-300 border-slate-500/40",
};

const statusStyles: Record<string, string> = {
  ORPHAN: "bg-red-500/20 text-red-300 border-red-500/40",
  POCO_COLLEGATA: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  OK: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
};

export default function AdminSeoPage() {
  const overallCtr = gscData.totals.impressions > 0 ? gscData.totals.clicks / gscData.totals.impressions : 0;
  const avgPosition = average(gscData.byDate.map((row) => row.position));

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-16 text-neutral-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-3xl">SEO Engine — panoramica</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Dati generati automaticamente da Google Search Console. Nessun contenuto pubblico viene modificato da questa pagina: ogni suggerimento va valutato e applicato manualmente.
        </p>

        <section className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Click (28gg)" value={gscData.totals.clicks.toLocaleString("it-IT")} />
          <Stat label="Impression (28gg)" value={gscData.totals.impressions.toLocaleString("it-IT")} />
          <Stat label="CTR medio" value={gscData.totals.impressions > 0 ? formatPercent(overallCtr) : "—"} />
          <Stat label="Posizione media" value={gscData.byDate.length > 0 ? avgPosition.toFixed(1) : "—"} />
        </section>
        <p className="mt-3 text-xs text-neutral-500">
          Periodo: {gscData.period ? `${gscData.period.startDate} → ${gscData.period.endDate}` : "nessuno"} · Ultimo aggiornamento Search Console: {formatDate(gscData.generatedAt)}
        </p>

        <section className="mt-14">
          <h2 className="font-display text-xl">Opportunità SEO ({opportunitiesData.opportunities.length})</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Regole: posizione {opportunitiesData.rules.positionRange[0]}–{opportunitiesData.rules.positionRange[1]}, almeno {opportunitiesData.rules.minImpressions} impression, CTR sotto {formatPercent(opportunitiesData.rules.lowCtrThreshold)}. Ultimo calcolo: {formatDate(opportunitiesData.generatedAt)}.
          </p>
          {opportunitiesData.opportunities.length === 0 ? (
            <EmptyState text="Nessuna opportunità ancora calcolata. Serve almeno una sincronizzazione Search Console (npm run seo:all)." />
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-800">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-neutral-900 text-xs uppercase tracking-wide text-neutral-400">
                  <tr>
                    <th className="px-4 py-3">Query</th>
                    <th className="px-4 py-3">Pagina</th>
                    <th className="px-4 py-3">Posizione</th>
                    <th className="px-4 py-3">Impression</th>
                    <th className="px-4 py-3">CTR</th>
                    <th className="px-4 py-3">Priorità</th>
                    <th className="px-4 py-3">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunitiesData.opportunities.map((opp, index) => (
                    <tr key={`${opp.query}-${opp.page}-${index}`} className="border-t border-neutral-800 align-top">
                      <td className="px-4 py-3 font-medium">
                        {opp.query}
                        {opp.localArea ? (
                          <span className="ml-2 rounded-full border border-sky-500/40 bg-sky-500/20 px-2 py-0.5 text-[10px] text-sky-300">
                            locale: {opp.localArea}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-neutral-300">
                        {opp.page}
                        {!opp.pageExists ? <span className="ml-1 text-[10px] text-neutral-500">(nessuna pagina corrispondente)</span> : null}
                      </td>
                      <td className="px-4 py-3">{opp.position.toFixed(1)}</td>
                      <td className="px-4 py-3">{opp.impressions.toLocaleString("it-IT")}</td>
                      <td className="px-4 py-3">{formatPercent(opp.ctr)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${priorityStyles[opp.priority]}`}>{opp.priority}</span>
                      </td>
                      <td className="px-4 py-3 max-w-md text-xs text-neutral-400">{opp.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-14">
          <h2 className="font-display text-xl">Internal linking ({siteRoutes.length} pagine)</h2>
          <p className="mt-1 text-xs text-neutral-500">{internalLinksData.note} Ultimo calcolo: {formatDate(internalLinksData.generatedAt)}.</p>
          {internalLinksData.routes.length === 0 ? (
            <EmptyState text="Non ancora calcolato. Esegui npm run seo:internal-links (o seo:all)." />
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-800">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-neutral-900 text-xs uppercase tracking-wide text-neutral-400">
                  <tr>
                    <th className="px-4 py-3">Pagina</th>
                    <th className="px-4 py-3">Link in ingresso</th>
                    <th className="px-4 py-3">Stato</th>
                    <th className="px-4 py-3">Collegata da</th>
                  </tr>
                </thead>
                <tbody>
                  {internalLinksData.routes.map((route) => (
                    <tr key={route.path} className="border-t border-neutral-800 align-top">
                      <td className="px-4 py-3 font-medium">
                        {route.label} <span className="text-neutral-500">({route.path})</span>
                      </td>
                      <td className="px-4 py-3">{route.inboundContextualLinks}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${statusStyles[route.status]}`}>{route.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-400">{route.linkedFrom.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-14">
          <h2 className="font-display text-xl">Base tecnica</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-neutral-400">
            <li>Title, meta description, canonical e Open Graph: generati per ogni pagina da <code>lib/seo.ts#buildMetadata</code>.</li>
            <li>Dati strutturati reali (nessun dato inventato): EntertainmentBusiness, Person, BreadcrumbList, FAQPage.</li>
            <li>Sitemap (<code>app/sitemap.ts</code>) e questo controllo di internal linking condividono la stessa lista di pagine in <code>data/routes.ts</code>: non possono disallinearsi.</li>
            <li><code>app/robots.ts</code> esclude <code>/admin</code> dalla scansione, oltre al Basic Auth su questa dashboard.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="mt-4 rounded-lg border border-dashed border-neutral-800 p-6 text-sm text-neutral-500">{text}</p>;
}
