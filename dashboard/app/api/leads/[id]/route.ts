import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub } from "../../../../lib/dataSource";
import type { LeadsFile } from "../../../../lib/types";

export const runtime = "nodejs";

// Segna un lead come "inviato" (il messaggio è stato copiato e mandato a
// mano da Instagram/Facebook, come da nota in pagina — non esiste un'API DM
// da automatizzare) o "scartato". Nessun invio reale avviene qui.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json()) as { status?: string };
  if (body.status !== "inviato" && body.status !== "scartato") {
    return NextResponse.json({ error: "Stato non valido." }, { status: 400 });
  }

  try {
    await aggiornaDatiSuGitHub<LeadsFile>(
      "leads.json",
      (attuale) => {
        const lead = attuale.leads.find((l) => l.id === params.id);
        if (!lead) throw new Error("Lead non trovato.");
        lead.status = body.status!;
        return attuale;
      },
      `chore(lead): segna ${params.id} come ${body.status}`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
