import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub } from "../../../../lib/dataSource";
import type { OutreachConfigFile } from "../../../../lib/types";

export const runtime = "nodejs";

// Salva dove l'Agente Esploratore deve cercare i locali (pagina "Locali"):
// città (ognuna con il raggio scelto) e/o intere province. Tutto vuoto =
// raggio intorno alla sede. Vedi agents/outreach-agent.ts > zoneDaConfig.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { province?: unknown; citta?: unknown; raggioKm?: unknown };
  if (!Array.isArray(body.province)) {
    return NextResponse.json({ error: "Campo 'province' mancante o non valido." }, { status: 400 });
  }
  const province = body.province.filter((p): p is string => typeof p === "string" && /^[A-Z]{2}$/.test(p));
  const citta = Array.isArray(body.citta)
    ? [...new Set(body.citta.filter((c): c is string => typeof c === "string").map((c) => c.trim().replace(/\s+/g, " ")).filter((c) => c.length >= 2 && c.length <= 60))].slice(0, 20)
    : undefined;
  const raggio = Number(body.raggioKm);
  const raggioKm = Number.isFinite(raggio) ? Math.min(60, Math.max(3, Math.round(raggio))) : undefined;

  try {
    await aggiornaDatiSuGitHub<OutreachConfigFile>(
      "outreach-config.json",
      (attuale) => {
        attuale.province = province;
        if (citta) attuale.citta = citta;
        if (raggioKm) attuale.raggioKm = raggioKm;
        return attuale;
      },
      "chore(locali): aggiorna le zone di ricerca dell'Esploratore [skip ci]"
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
