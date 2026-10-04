import { MessageCircle } from "lucide-react";

function soloCifre(numero: string): string {
  return numero.replace(/[^0-9]/g, "");
}

// Link wa.me con messaggio già scritto: apre WhatsApp (app o web) con la
// chat pronta, il tap "Invia" resta sempre tuo. Nessuna API, nessun costo.
export function WhatsAppSendButton({ telefono, messaggio }: { telefono: string; messaggio: string }) {
  if (!telefono) {
    return <p className="note">Nessun numero di telefono salvato per questo evento.</p>;
  }
  const href = `https://wa.me/${soloCifre(telefono)}?text=${encodeURIComponent(messaggio)}`;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="btn btn--primary">
      <MessageCircle size={16} aria-hidden="true" />
      Invia su WhatsApp
    </a>
  );
}
