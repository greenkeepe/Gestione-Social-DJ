import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub, lanciaWorkflow } from "../../../lib/dataSource";
import type { ReelJobsFile, ProfiloReel } from "../../../lib/types";

export const runtime = "nodejs";

const PROFILI_VALIDI: ProfiloReel[] = ["auto", "dj_party", "wedding", "event", "business", "talking_head", "promotional"];

// Il video grezzo è già su Cloudflare R2 a questo punto (stesso upload diretto
// dal browser usato dalla pagina "Carica media"): qui salviamo solo il
// riferimento in data/reel-jobs.json. Lo elabora poi il Regista
// (agents/reel-maker-agent.ts), eseguito da .github/workflows/reel-maker.yml.
export async function POST(req: Request) {
  const body = (await req.json()) as {
    url?: string;
    filename?: string;
    mimeType?: string;
    profilo?: string;
    istruzioni?: string;
  };

  if (!body.url || !body.filename || !body.mimeType) {
    return NextResponse.json({ error: "Dati mancanti (url, filename, mimeType)." }, { status: 400 });
  }
  if (!body.mimeType.startsWith("video/")) {
    return NextResponse.json({ error: "L'AI Reel Maker accetta solo file video." }, { status: 400 });
  }
  const profilo = (PROFILI_VALIDI as string[]).includes(body.profilo ?? "") ? (body.profilo as ProfiloReel) : "auto";

  try {
    await aggiornaDatiSuGitHub<ReelJobsFile>(
      "reel-jobs.json",
      (attuale) => {
        attuale.jobs.unshift({
          id: randomUUID(),
          createdAt: new Date().toISOString(),
          videoUrl: body.url!,
          filename: body.filename!,
          mimeType: body.mimeType!,
          profilo,
          istruzioni: body.istruzioni?.trim() || null,
          status: "in-coda-analisi",
          step: "in-coda",
          aggiornatoIl: new Date().toISOString(),
          erroreMessaggio: null,
          risultato: null,
          source: "dashboard"
        });
        return attuale;
      },
      `chore(reel-ai): nuovo video grezzo "${body.filename}" in coda`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  // Avvia subito il Regista invece di aspettare il prossimo giro
  // programmato (ogni ~20 minuti): così il montaggio parte appena carichi
  // il video. Best-effort: se fallisce, il ciclo automatico lo prende
  // comunque al prossimo giro.
  try {
    await lanciaWorkflow("reel-maker.yml");
  } catch {
    /* non bloccante */
  }

  return NextResponse.json({ ok: true });
}
