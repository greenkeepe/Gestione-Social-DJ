import { NextResponse } from "next/server";
import { leggiDati, aggiornaDatiSuGitHub } from "../../../../../lib/dataSource";
import { inviaEmail } from "../../../../../lib/email";
import type { OutreachFile } from "../../../../../lib/types";

export const runtime = "nodejs";

// Invia DAVVERO l'email al locale — solo quando Andrea preme questo tasto
// dalla pagina "Locali". Un contatto alla volta, mai un invio di massa:
// la bozza è già scritta dall'Agente Esploratore, qui la spediamo e basta.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const file = await leggiDati<OutreachFile>("outreach-locali.json");
    const contatto = file.contatti.find((c) => c.id === params.id);
    if (!contatto) return NextResponse.json({ error: "Contatto non trovato." }, { status: 404 });
    if (contatto.status !== "bozza-da-rivedere") {
      return NextResponse.json({ error: "Questo contatto non è più in attesa di revisione." }, { status: 400 });
    }

    await inviaEmail({ to: contatto.email, subject: contatto.oggetto, text: contatto.corpo });

    await aggiornaDatiSuGitHub<OutreachFile>(
      "outreach-locali.json",
      (attuale) => {
        const c = attuale.contatti.find((x) => x.id === params.id);
        if (c) {
          c.status = "inviata";
          c.inviataIl = new Date().toISOString();
        }
        return attuale;
      },
      `chore(locali): email inviata a "${contatto.nomeLocale}"`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
