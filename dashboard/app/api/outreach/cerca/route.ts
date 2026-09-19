import { NextResponse } from "next/server";
import { lanciaWorkflow } from "../../../../lib/dataSource";

export const runtime = "nodejs";

// Avvia una ricerca on-demand dell'Esploratore (fino a 10 nuovi locali)
// tramite .github/workflows/outreach-search.yml — non gira più in
// automatico nel ciclo giornaliero. La ricerca gira su GitHub Actions
// (qualche minuto): questa chiamata la avvia soltanto, i nuovi contatti
// compaiono in "Da rivedere" quando il workflow finisce.
export async function POST() {
  try {
    await lanciaWorkflow("outreach-search.yml");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
