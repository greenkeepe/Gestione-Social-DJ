import { NextResponse } from "next/server";
import { lanciaWorkflow } from "../../../../lib/dataSource";

export const runtime = "nodejs";

// Avvia il workflow "AI Reel Maker" con l'opzione "rielabora": il motore
// Regia rimonta i Reel in coda non ancora pubblicati (vedi
// scripts/regia-rielabora.ts). Serve il GITHUB_TOKEN con "Actions: write",
// lo stesso già usato da "Rigenera" in Crea Reel AI.
export async function POST(req: Request) {
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  try {
    await lanciaWorkflow("reel-maker.yml", { rielabora: "si", job_id: id ?? "" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
