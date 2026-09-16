import { NextResponse } from "next/server";
import { lanciaWorkflow } from "../../../../lib/dataSource";

export const runtime = "nodejs";

// Avvia il workflow "Svuota tutti i media" (.github/workflows/svuota-media.yml):
// cancella OGNI file da Cloudflare R2 e svuota media-library/reel-jobs/
// posts-queue. Lanciato da GitHub Actions (non dalla funzione serverless
// della dashboard) per non rischiare il timeout di Vercel se i file sono
// tanti, ed è la stessa identica operazione già testata manualmente. La
// conferma "vera" (window.confirm) avviene lato dashboard prima di chiamare
// questa route.
export async function POST() {
  try {
    await lanciaWorkflow("svuota-media.yml", { conferma: "CONFERMA" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
