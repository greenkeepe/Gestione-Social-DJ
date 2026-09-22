import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub } from "../../../../lib/dataSource";
import type { OutreachConfigFile } from "../../../../lib/types";

export const runtime = "nodejs";

const MAX_CONSENTITO_AL_GIORNO = 20;

// Attiva/disattiva l'invio automatico e ne fissa il limite giornaliero
// (pagina "Locali"). Il cron (dashboard/app/api/cron/outreach-auto-send)
// comunque non invia nulla finché non esiste anche un modello validato in
// data/outreach-template.json: i due controlli sono indipendenti apposta.
export async function POST(req: Request) {
  const body = (await req.json()) as { attivo?: boolean; maxAlGiorno?: number };
  if (typeof body.attivo !== "boolean") {
    return NextResponse.json({ error: "Campo 'attivo' mancante o non valido." }, { status: 400 });
  }
  if (
    typeof body.maxAlGiorno !== "number" ||
    !Number.isInteger(body.maxAlGiorno) ||
    body.maxAlGiorno < 0 ||
    body.maxAlGiorno > MAX_CONSENTITO_AL_GIORNO
  ) {
    return NextResponse.json(
      { error: `Campo 'maxAlGiorno' non valido: deve essere un intero tra 0 e ${MAX_CONSENTITO_AL_GIORNO}.` },
      { status: 400 }
    );
  }

  try {
    await aggiornaDatiSuGitHub<OutreachConfigFile>(
      "outreach-config.json",
      (attuale) => {
        attuale.invioAutomatico = { attivo: body.attivo!, maxAlGiorno: body.maxAlGiorno! };
        return attuale;
      },
      `chore(locali): invio automatico ${body.attivo ? "attivato" : "disattivato"} (max ${body.maxAlGiorno}/giorno)`
    );
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
