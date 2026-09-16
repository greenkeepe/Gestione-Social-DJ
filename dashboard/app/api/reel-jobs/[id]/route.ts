import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub } from "../../../../lib/dataSource";
import { eliminaOggettoR2 } from "../../../../lib/r2Server";
import type { ReelJobsFile } from "../../../../lib/types";

export const runtime = "nodejs";

// Elimina un job dell'AI Reel Maker (pagina "Crea Reel AI") — video grezzo
// e/o Reel montato che non vuoi più tenere. Elimina anche i file su R2.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  let urlDaEliminare: string[] = [];

  try {
    await aggiornaDatiSuGitHub<ReelJobsFile>(
      "reel-jobs.json",
      (attuale) => {
        const job = attuale.jobs.find((j) => j.id === params.id);
        if (job) {
          urlDaEliminare = [job.videoUrl, job.risultato?.reelUrl].filter((u): u is string => Boolean(u));
        }
        attuale.jobs = attuale.jobs.filter((j) => j.id !== params.id);
        return attuale;
      },
      `chore(reel-ai): elimina job ${params.id}`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  await Promise.all(urlDaEliminare.map((u) => eliminaOggettoR2(u).catch(() => {})));

  return NextResponse.json({ ok: true });
}
