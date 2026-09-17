import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub } from "../../../../lib/dataSource";
import type { OutreachFile } from "../../../../lib/types";

export const runtime = "nodejs";

// Scarta una bozza senza inviarla (locale non adatto, indirizzo sbagliato,
// ecc.): resta nello storico con stato "scartata", non viene più riproposta
// (l'Agente Esploratore non ritratta mai gli stessi id OpenStreetMap).
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await aggiornaDatiSuGitHub<OutreachFile>(
      "outreach-locali.json",
      (attuale) => {
        const c = attuale.contatti.find((x) => x.id === params.id);
        if (c) c.status = "scartata";
        return attuale;
      },
      `chore(locali): scarta contatto ${params.id}`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
