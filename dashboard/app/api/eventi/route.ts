import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub } from "../../../lib/dataSource";
import type { Evento, EventiFile, TipoEvento } from "../../../lib/types";

export const runtime = "nodejs";

const TIPI_VALIDI: TipoEvento[] = ["matrimonio", "compleanno", "aziendale", "party", "altro"];

// Crea un nuovo evento/prenotazione: solo i dati che conosci già tu al
// momento della prenotazione (tipo, cliente, telefono, data). Per i
// matrimoni, l'id generato qui diventa l'URL personale del Wedding Music
// Planner (fortedj.it/questionario-sposi/<id>) che mandi via WhatsApp.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tipo = TIPI_VALIDI.includes(body.tipo) ? (body.tipo as TipoEvento) : null;
    const cliente = typeof body.cliente === "string" ? body.cliente.trim() : "";
    const data = typeof body.data === "string" ? body.data.trim() : "";

    if (!tipo) return NextResponse.json({ error: "Tipo evento non valido." }, { status: 400 });
    if (!cliente) return NextResponse.json({ error: "Inserisci il nome del cliente/sposi." }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Inserisci la data dell'evento." }, { status: 400 });

    const evento: Evento = {
      id: randomUUID(),
      tipo,
      cliente,
      telefono: typeof body.telefono === "string" ? body.telefono.trim() : "",
      email: typeof body.email === "string" ? body.email.trim() : "",
      data,
      location: typeof body.location === "string" ? body.location.trim() : "",
      note: typeof body.note === "string" ? body.note.trim() : "",
      creatoIl: new Date().toISOString(),
      pianificatoreCompilato: false,
      pianificatore: null
    };

    await aggiornaDatiSuGitHub<EventiFile>(
      "eventi.json",
      (attuale) => {
        attuale.eventi.unshift(evento);
        return attuale;
      },
      `chore(eventi): nuovo evento "${cliente}" (${tipo})`
    );

    return NextResponse.json({ ok: true, evento });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
