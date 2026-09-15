import { leggiDati } from "../../../lib/dataSource";
import type { LeadsFile } from "../../../lib/types";

export const dynamic = "force-dynamic";

export default async function LeadPage() {
  const leadsFile = await leggiDati<LeadsFile>("leads.json");
  const daRivedere = leadsFile.leads.filter((l) => l.status === "bozza-da-rivedere");
  const altri = leadsFile.leads.filter((l) => l.status !== "bozza-da-rivedere");

  return (
    <div>
      <h2>Lead</h2>
      <p className="note">
        Queste sono bozze di messaggi preparate dall&apos;Agente Cacciatore per persone che hanno già interagito con i tuoi contenuti.
        <strong> Nessun messaggio viene inviato automaticamente</strong>: copia il testo (o modificalo) e invialo tu da Instagram/Facebook.
        Dopo averlo inviato, aggiorna manualmente lo stato in data/leads.json (o chiedimelo per aggiungere un pulsante dedicato).
      </p>

      <h3>Da rivedere ({daRivedere.length})</h3>
      {daRivedere.length === 0 && <p className="note">Nessuna nuova bozza al momento.</p>}
      <div className="grid">
        {daRivedere.map((l) => (
          <div className="card" key={l.id}>
            <div className="label">@{l.username}</div>
            <p className="note">Fonte: {l.fonte}</p>
            <p className="note">Commento: &ldquo;{l.commentoOriginale}&rdquo;</p>
            <p><strong>Messaggio proposto:</strong><br />{l.messaggioProposto}</p>
            <p className="note">{new Date(l.creatoIl).toLocaleString("it-IT")}</p>
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
                  <td>{l.status}</td>
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
