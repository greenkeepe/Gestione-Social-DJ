import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub } from "../../../../lib/dataSource";
import type { OutreachConfigFile } from "../../../../lib/types";

export const runtime = "nodejs";

// Salva le province in cui l'Agente Esploratore deve cercare (pagina
// "Locali"): vuoto = torna al raggio intorno alla sede (comportamento di
// prima), vedi agents/outreach-agent.ts > cercaCandidati.
export async function POST(req: Request) {
  const body = (await req.json()) as { province?: string[] };
  if (!Array.isArray(body.province)) {
    return NextResponse.json({ error: "Campo 'province' mancante o non valido." }, { status: 400 });
  }

  try {
    await aggiornaDatiSuGitHub<OutreachConfigFile>(
      "outreach-config.json",
      (attuale) => {
        attuale.province = body.province!;
        return attuale;
      },
      "chore(locali): aggiorna le province di ricerca dell'Esploratore"
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
