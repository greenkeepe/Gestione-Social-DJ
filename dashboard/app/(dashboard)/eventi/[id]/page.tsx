import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { leggiDati } from "../../../../lib/dataSource";
import type { EventiFile } from "../../../../lib/types";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { EmptyState } from "../../../../components/ui/EmptyState";
import { WhatsAppSendButton } from "../../../../components/WhatsAppSendButton";
import { EmailSendButton } from "../../../../components/EmailSendButton";
import { CopiaLinkButton } from "../../../../components/CopiaLinkButton";
import { EliminaEventoButton } from "../../../../components/EliminaEventoButton";
import { DettagliPianificatore } from "../../../../components/DettagliPianificatore";
import { statusVocabulary } from "../../../../lib/statusVocabulary";

export const dynamic = "force-dynamic";

const BASE_URL = "https://www.fortedj.it";

function formattaData(data: string): string {
  const d = new Date(`${data}T00:00:00`);
  if (Number.isNaN(d.getTime())) return data;
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

export default async function EventoPage({ params }: { params: { id: string } }) {
  const file = await leggiDati<EventiFile>("eventi.json").catch((): EventiFile => ({ eventi: [] }));
  const evento = file.eventi.find((e) => e.id === params.id);
  if (!evento) notFound();

  const link = `${BASE_URL}/questionario-sposi/${evento.id}`;
  const messaggioWhatsApp =
    evento.tipo === "matrimonio"
      ? `Ciao ${evento.cliente}! 🎧 Per preparare al meglio la musica del vostro matrimonio, vi chiedo di compilare questo breve questionario: ${link}\nGrazie, Andrea – Forte DJ`
      : `Ciao ${evento.cliente}! Ti confermo la prenotazione per il ${formattaData(evento.data)}. A presto, Andrea – Forte DJ`;

  return (
    <div>
      <Link href="/eventi" className="note" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
        <ArrowLeft size={14} aria-hidden="true" /> Torna agli eventi
      </Link>

      <PageHeader
        title={evento.cliente}
        description={`${formattaData(evento.data)}${evento.location ? ` · ${evento.location}` : ""}`}
        action={<StatusBadge {...statusVocabulary.tipoEvento(evento.tipo)} />}
      />

      <div className="card">
        <div className="label">Dati di contatto</div>
        <p className="note">Telefono: {evento.telefono || "—"}</p>
        <p className="note">Email: {evento.email || "—"}</p>
        {evento.note && <p className="note">Note: {evento.note}</p>}
        {evento.tipo !== "matrimonio" && (
          <div className="flex gap-sm mt-sm">
            <WhatsAppSendButton telefono={evento.telefono} messaggio={messaggioWhatsApp} />
          </div>
        )}
      </div>

      {evento.tipo === "matrimonio" && (
        <>
          <h3 className="mt-lg">Wedding Music Planner</h3>
          <div className="card">
            <div className="flex gap-xs" style={{ alignItems: "center", justifyContent: "space-between" }}>
              <StatusBadge {...statusVocabulary.pianificatore(evento.pianificatoreCompilato ? "compilato" : "in-attesa")} />
              <CopiaLinkButton link={link} />
            </div>
            <p className="note" style={{ wordBreak: "break-all" }}>{link}</p>
            <div className="flex gap-sm mt-sm">
              <WhatsAppSendButton telefono={evento.telefono} messaggio={messaggioWhatsApp} />
              <EmailSendButton id={evento.id} email={evento.email} />
            </div>
          </div>

          {evento.pianificatoreCompilato && evento.pianificatore ? (
            <DettagliPianificatore p={evento.pianificatore} />
          ) : (
            <EmptyState
              title="Questionario non ancora compilato"
              description="Manda il link via WhatsApp qui sopra: appena gli sposi lo compilano, le risposte compaiono qui."
            />
          )}
        </>
      )}

      <div style={{ marginTop: 24 }}>
        <EliminaEventoButton id={evento.id} cliente={evento.cliente} />
      </div>
    </div>
  );
}
