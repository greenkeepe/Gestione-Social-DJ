import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub } from "../../../../lib/dataSource";
import type { PostsQueueFile } from "../../../../lib/types";

export const runtime = "nodejs";

// Elimina un contenuto dalla coda (pagina "Contenuti"): usato per togliere
// test/bozze/contenuti che non vuoi più pubblicare. Lo storico di ciò che è
// già stato pubblicato davvero resta comunque in published-log.json.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await aggiornaDatiSuGitHub<PostsQueueFile>(
      "posts-queue.json",
      (attuale) => {
        attuale.queue = attuale.queue.filter((q) => q.id !== params.id);
        return attuale;
      },
      `chore(contenuti): elimina contenuto ${params.id}`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Modifica didascalia/hashtag/orario di un contenuto ancora in coda (non
// ancora pubblicato) — per correggere a mano quello che gli agenti hanno
// scritto, senza dover eliminare e ricaricare il media da capo.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json()) as { caption?: string; hashtags?: string[]; orarioProgrammato?: string };

  try {
    await aggiornaDatiSuGitHub<PostsQueueFile>(
      "posts-queue.json",
      (attuale) => {
        const item = attuale.queue.find((q) => q.id === params.id);
        if (!item) throw new Error("Contenuto non trovato.");
        if (typeof body.caption === "string") item.caption = body.caption;
        if (Array.isArray(body.hashtags)) item.hashtags = body.hashtags;
        if (typeof body.orarioProgrammato === "string") item.orarioProgrammato = body.orarioProgrammato;
        return attuale;
      },
      `chore(contenuti): modifica contenuto ${params.id}`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
