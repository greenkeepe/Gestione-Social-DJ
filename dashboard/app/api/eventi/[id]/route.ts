import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub } from "../../../../lib/dataSource";
import type { Evento, EventiFile, TipoEvento } from "../../../../lib/types";

export const runtime = "nodejs";

const TIPI_VALIDI: TipoEvento[] = ["matrimonio", "compleanno", "aziendale", "party", "altro"];

// Modifica i dati di prenotazione di un evento esistente (es. aggiungere
// telefono/email dopo averlo creato senza, o correggere la data) — gli
// stessi campi di NuovoEventoModal, qui riusato in modalità modifica.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const tipo = TIPI_VALIDI.includes(body.tipo) ? (body.tipo as TipoEvento) : null;
    const cliente = typeof body.cliente === "string" ? body.cliente.trim() : "";
    const data = typeof body.data === "string" ? body.data.trim() : "";

    if (!tipo) return NextResponse.json({ error: "Tipo evento non valido." }, { status: 400 });
    if (!cliente) return NextResponse.json({ error: "Inserisci il nome del cliente/sposi." }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Inserisci la data dell'evento." }, { status: 400 });

    let eventoAggiornato: Evento | null = null;

    await aggiornaDatiSuGitHub<EventiFile>(
      "eventi.json",
      (attuale) => {
        const evento = attuale.eventi.find((e) => e.id === params.id);
        if (!evento) throw new Error("Evento non trovato.");
        evento.tipo = tipo;
        evento.cliente = cliente;
        evento.telefono = typeof body.telefono === "string" ? body.telefono.trim() : "";
        evento.email = typeof body.email === "string" ? body.email.trim() : "";
        evento.data = data;
        evento.location = typeof body.location === "string" ? body.location.trim() : "";
        evento.note = typeof body.note === "string" ? body.note.trim() : "";
        eventoAggiornato = evento;
        return attuale;
      },
      `chore(eventi): modifica evento "${cliente}"`
    );

    return NextResponse.json({ ok: true, evento: eventoAggiornato });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await aggiornaDatiSuGitHub<EventiFile>(
      "eventi.json",
      (attuale) => {
        attuale.eventi = attuale.eventi.filter((e) => e.id !== params.id);
        return attuale;
      },
      `chore(eventi): elimina evento ${params.id}`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
