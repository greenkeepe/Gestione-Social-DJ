import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub, lanciaWorkflow } from "../../../../../lib/dataSource";
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

  // Avvia subito il Regista invece di aspettare il prossimo giro
  // programmato (ogni ~20 minuti): stesso motivo del trigger già aggiunto
  // al primo caricamento in dashboard/app/api/reel-jobs/route.ts.
  try {
    await lanciaWorkflow("reel-maker.yml");
  } catch {
    /* non bloccante */
  }

  return NextResponse.json({ ok: true });
}
