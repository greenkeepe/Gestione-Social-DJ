import { NextResponse } from "next/server";
import { lanciaWorkflow } from "../../../../lib/dataSource";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Chiamata da Vercel Cron (vedi dashboard/vercel.json) all'orario esatto,
// al posto dello "schedule" di GitHub Actions che può arrivare con ore di
// ritardo sui repository con poca attività continua. Innesca lo stesso
// ciclo giornaliero di sempre via workflow_dispatch, con forza_resoconto
// così il resoconto mattutino su Telegram parte comunque (la condizione in
// daily-agents.yml lo manda solo su "schedule" o su questo flag esplicito).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  try {
    await lanciaWorkflow("daily-agents.yml", { forza_resoconto: "true" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
