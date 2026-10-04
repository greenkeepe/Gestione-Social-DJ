import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub } from "../../../../lib/dataSource";
import type { EventiFile } from "../../../../lib/types";

export const runtime = "nodejs";

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
