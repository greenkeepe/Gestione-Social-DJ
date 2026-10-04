import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub } from "../../../../lib/dataSource";
import type { QuestionariFile } from "../../../../lib/types";

export const runtime = "nodejs";

// Segna/togli il segna-come-letto su un questionario: solo per tenere
// traccia di quali hai già controllato, nessun invio o modifica dei dati
// compilati dagli sposi.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await aggiornaDatiSuGitHub<QuestionariFile>(
      "questionari-sposi.json",
      (attuale) => {
        const q = attuale.questionari.find((x) => x.id === params.id);
        if (q) q.letto = !q.letto;
        return attuale;
      },
      `chore(questionari): aggiornato stato lettura ${params.id}`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
