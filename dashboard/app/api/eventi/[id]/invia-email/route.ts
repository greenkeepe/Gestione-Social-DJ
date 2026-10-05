import { NextResponse } from "next/server";
import { leggiDati } from "../../../../../lib/dataSource";
import { inviaEmail } from "../../../../../lib/email";
import type { EventiFile } from "../../../../../lib/types";

export const runtime = "nodejs";

const BASE_URL = "https://www.fortedj.it";

// Invia via email (dalla casella Gmail vera, stesso meccanismo già usato
// per i locali) il link del Wedding Music Planner al cliente di un evento.
// Non modifica lo stato dell'evento: può essere inviata più volte, es. se
// il cliente la perde.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const file = await leggiDati<EventiFile>("eventi.json");
    const evento = file.eventi.find((e) => e.id === params.id);
    if (!evento) return NextResponse.json({ error: "Evento non trovato." }, { status: 404 });
    if (evento.tipo !== "matrimonio") {
      return NextResponse.json({ error: "Solo i matrimoni hanno un Wedding Music Planner da inviare." }, { status: 400 });
    }
    if (!evento.email) return NextResponse.json({ error: "Nessuna email salvata per questo evento." }, { status: 400 });

    const link = `${BASE_URL}/questionario-sposi/${evento.id}`;
    const testo = `Ciao ${evento.cliente}!\n\nPer preparare al meglio la musica del vostro matrimonio, vi chiedo di compilare questo breve questionario:\n${link}\n\nGrazie,\nAndrea – Forte DJ`;
    const html = `<p>Ciao ${evento.cliente}!</p><p>Per preparare al meglio la musica del vostro matrimonio, vi chiedo di compilare questo breve questionario:</p><p><a href="${link}">${link}</a></p><p>Grazie,<br>Andrea – Forte DJ</p>`;

    await inviaEmail({
      to: evento.email,
      subject: `Wedding Music Planner — ${evento.cliente}`,
      text: testo,
      html
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
