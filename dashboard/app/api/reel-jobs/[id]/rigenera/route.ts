import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub } from "../../../../../lib/dataSource";
import type { ReelJobsFile } from "../../../../../lib/types";

export const runtime = "nodejs";

// Rimette il job in coda per una nuova elaborazione (usato sia dopo un
// errore, sia per chiedere un nuovo montaggio dallo stesso video grezzo).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await aggiornaDatiSuGitHub<ReelJobsFile>(
      "reel-jobs.json",
      (attuale) => {
        const job = attuale.jobs.find((j) => j.id === params.id);
        if (!job) throw new Error("Job non trovato.");
        job.status = "in-coda-analisi";
        job.step = "in-coda";
        job.erroreMessaggio = null;
        job.risultato = null;
        job.aggiornatoIl = new Date().toISOString();
        return attuale;
      },
      `chore(reel-ai): rigenera job ${params.id}`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
