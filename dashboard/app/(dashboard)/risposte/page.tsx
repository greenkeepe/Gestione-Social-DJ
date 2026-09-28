import { MessageCircle } from "lucide-react";
import { leggiDati } from "../../../lib/dataSource";
import type { RispostiFile } from "../../../lib/types";
import { PageHeader } from "../../../components/ui/PageHeader";
import { EmptyState } from "../../../components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function RispostePage() {
  const file = await leggiDati<RispostiFile>("comment-replies.json");
  const risposte = file.risposte ?? [];

  return (
    <div>
      <PageHeader
        icon={<MessageCircle size={22} aria-hidden="true" />}
        title="Risposte ai commenti"
        description="Risposte pubbliche scritte in automatico dall'Agente Portavoce sotto i commenti dei tuoi ultimi post — sempre in pubblico, mai un messaggio privato, mai prezzi o disponibilità specifiche. Qui trovi solo quelle pubblicate da quando questa pagina esiste: le risposte precedenti non avevano il testo salvato."
      />

      <h3>{risposte.length} risposte pubblicate</h3>
      {risposte.length === 0 && <EmptyState title="Nessuna risposta pubblicata ancora" />}
      <div className="grid">
        {risposte.map((r) => (
          <div className="card" key={r.commentId}>
            <div className="label">@{r.username}</div>
            <p className="note">Commento: &ldquo;{r.commentoOriginale}&rdquo;</p>
            <p>
              <strong>Risposta:</strong>
              <br />
              {r.risposta}
            </p>
            <p className="note">{new Date(r.timestamp).toLocaleString("it-IT")}</p>
            {r.permalink && (
              <p className="note">
                <a href={r.permalink} target="_blank" rel="noreferrer">
                  Vedi il post →
                </a>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
