import { NextResponse } from "next/server";
import { leggiDati, lanciaWorkflow } from "../../../../../lib/dataSource";
import type { PostsQueueFile } from "../../../../../lib/types";

export const runtime = "nodejs";

// Pubblica SUBITO un contenuto già "pronto" in coda, invece di aspettare il
// prossimo controllo automatico (che gira più volte al giorno, ma può
// ritardare — vedi il commento in .github/workflows/publish-check.yml).
// Passa l'id a publish-check.yml, che lo pubblica ignorando sia il limite
// di 1/giorno per canale sia la finestra oraria (vedi FORCE_PUBLISH_QUEUE_ID
// in agents/publishing-agent.ts) — usato solo su richiesta esplicita di chi
// preme il tasto, mai dal ciclo schedulato normale.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const queueFile = await leggiDati<PostsQueueFile>("posts-queue.json");
    const item = queueFile.queue.find((q) => q.id === params.id);
    if (!item) {
      return NextResponse.json({ error: "Contenuto non trovato." }, { status: 404 });
    }
    if (item.status !== "pronto") {
      return NextResponse.json({ error: `Solo un contenuto "pronto" può essere pubblicato (stato attuale: ${item.status}).` }, { status: 400 });
    }

    await lanciaWorkflow("publish-check.yml", { forza_pubblicazione_id: params.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
