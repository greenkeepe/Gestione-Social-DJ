import { Users } from "lucide-react";
import { leggiDati } from "../../../lib/dataSource";
import type { LeadsFile } from "../../../lib/types";
import { PageHeader } from "../../../components/ui/PageHeader";
import { EmptyState } from "../../../components/ui/EmptyState";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { LeadActions } from "../../../components/LeadActions";
import { statusVocabulary } from "../../../lib/statusVocabulary";

export const dynamic = "force-dynamic";

export default async function LeadPage() {
  const leadsFile = await leggiDati<LeadsFile>("leads.json");
  const daRivedere = leadsFile.leads.filter((l) => l.status === "bozza-da-rivedere");
  const altri = leadsFile.leads.filter((l) => l.status !== "bozza-da-rivedere");

  return (
    <div>
      <PageHeader
        icon={<Users size={22} aria-hidden="true" />}
        title="Lead"
        description="Bozze di messaggi preparate dall'Agente Cacciatore per persone che hanno già interagito con i tuoi contenuti. Nessun messaggio viene inviato automaticamente: copia il testo (o modificalo) e invialo tu da Instagram/Facebook, poi segna qui l'esito."
      />

      <h3>Da rivedere ({daRivedere.length})</h3>
      {daRivedere.length === 0 && <EmptyState title="Nessuna nuova bozza al momento" />}
      <div className="grid">
        {daRivedere.map((l) => (
          <div className="card" key={l.id}>
            <div className="label">@{l.username}</div>
            <p className="note">Fonte: {l.fonte}</p>
            <p className="note">Commento: &ldquo;{l.commentoOriginale}&rdquo;</p>
            <p><strong>Messaggio proposto:</strong><br />{l.messaggioProposto}</p>
            <p className="note">{new Date(l.creatoIl).toLocaleString("it-IT")}</p>
            <LeadActions id={l.id} messaggio={l.messaggioProposto} />
          </div>
        ))}
      </div>

      {altri.length > 0 && (
        <>
          <h3>Storico</h3>
          <table>
            <thead><tr><th>Utente</th><th>Stato</th><th>Quando</th></tr></thead>
            <tbody>
              {altri.map((l) => (
                <tr key={l.id}>
                  <td>@{l.username}</td>
                  <td><StatusBadge {...statusVocabulary.lead(l.status)} /></td>
                  <td>{new Date(l.creatoIl).toLocaleString("it-IT")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
