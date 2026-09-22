import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub } from "../../../../lib/dataSource";
import type { OutreachTemplateFile } from "../../../../lib/types";

export const runtime = "nodejs";

// Salva il modello base dell'email ai locali (pagina "Locali"): ogni
// salvataggio imposta "validatoIl" a adesso, il segnale che l'invio
// automatico (dashboard/app/api/cron/outreach-auto-send) è autorizzato a
// usare questo testo. {{LOCALE}} nel corpo/oggetto viene sostituito col
// nome del locale al momento della bozza o dell'invio, non qui.
export async function POST(req: Request) {
  const body = (await req.json()) as { oggetto?: string; corpo?: string };
  if (!body.oggetto?.trim() || !body.corpo?.trim()) {
    return NextResponse.json({ error: "Oggetto e corpo non possono essere vuoti." }, { status: 400 });
  }

  try {
    await aggiornaDatiSuGitHub<OutreachTemplateFile>(
      "outreach-template.json",
      (attuale) => ({
        ...attuale,
        oggetto: body.oggetto!.trim(),
        corpo: body.corpo!.trim(),
        validatoIl: new Date().toISOString()
      }),
      "chore(locali): aggiorna e valida il modello email"
    );
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
