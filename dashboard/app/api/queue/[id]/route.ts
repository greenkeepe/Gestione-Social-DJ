import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub } from "../../../../lib/dataSource";
import { eliminaOggettoR2 } from "../../../../lib/r2Server";
import type { PostsQueueFile, ReelJobsFile } from "../../../../lib/types";

export const runtime = "nodejs";

// Elimina un contenuto dalla coda (pagine "Contenuti" e "Anteprima"): usato
// per togliere test/bozze/Reel che non vuoi pubblicare. Lo storico di ciò che
// è già stato pubblicato davvero resta comunque in published-log.json.
// Con ?file=1 (tasto "Elimina" in Anteprima) cancella anche i file su R2 per
// liberare spazio: il Reel, l'immagine originale da cui era stato creato e,
// per i video, il job del Regista con il girato grezzo.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const conFile = new URL(req.url).searchParams.get("file") === "1";
  let item: PostsQueueFile["queue"][number] | undefined;
  try {
    await aggiornaDatiSuGitHub<PostsQueueFile>(
      "posts-queue.json",
      (attuale) => {
        item = attuale.queue.find((q) => q.id === params.id);
        if (conFile && item && ["pubblicato", "pubblicato-parziale"].includes(item.status)) {
          throw new Error("Contenuto già pubblicato: non si elimina da qui.");
        }
        attuale.queue = attuale.queue.filter((q) => q.id !== params.id);
        return attuale;
      },
      `chore(contenuti): elimina contenuto ${params.id} [skip ci]`
    );
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
  if (!conFile || !item) return NextResponse.json({ ok: true });

  const daEliminare = new Set([item.media.downloadUrl, item.media.originale?.downloadUrl].filter((u): u is string => Boolean(u)));
  const mediaId = item.media.mediaId;
  if (mediaId) {
    // Reel da video: via anche il job del Regista (girato grezzo + Reel) e la voce in libreria
    try {
      await aggiornaDatiSuGitHub<ReelJobsFile>(
        "reel-jobs.json",
        (attuale) => {
          const job = attuale.jobs.find((j) => j.id === mediaId);
          if (job) [job.videoUrl, job.risultato?.reelUrl].forEach((u) => u && daEliminare.add(u));
          attuale.jobs = attuale.jobs.filter((j) => j.id !== mediaId);
          return attuale;
        },
        `chore(reel-ai): elimina job ${mediaId} [skip ci]`
      );
      await aggiornaDatiSuGitHub<{ items: Array<{ id: string }> }>(
        "media-library.json",
        (attuale) => ({ ...attuale, items: attuale.items.filter((i) => i.id !== mediaId) }),
        `chore(media): elimina ${mediaId} [skip ci]`
      );
    } catch {
      /* il contenuto è già fuori dalla coda: il resto è solo pulizia */
    }
  }
  await Promise.all([...daEliminare].map((u) => eliminaOggettoR2(u).catch(() => {})));
  return NextResponse.json({ ok: true, fileEliminati: daEliminare.size });
}

// Modifica didascalia/hashtag/orario di un contenuto ancora in coda (non
// ancora pubblicato) — per correggere a mano quello che gli agenti hanno
// scritto, senza dover eliminare e ricaricare il media da capo.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json()) as { caption?: string; hashtags?: string[]; orarioProgrammato?: string; dataProgrammata?: string };

  try {
    await aggiornaDatiSuGitHub<PostsQueueFile>(
      "posts-queue.json",
      (attuale) => {
        const item = attuale.queue.find((q) => q.id === params.id);
        if (!item) throw new Error("Contenuto non trovato.");
        if (typeof body.caption === "string") item.caption = body.caption;
        if (Array.isArray(body.hashtags)) item.hashtags = body.hashtags;
        if (typeof body.orarioProgrammato === "string") item.orarioProgrammato = body.orarioProgrammato;
        if (typeof body.dataProgrammata === "string") item.dataProgrammata = body.dataProgrammata;
        return attuale;
      },
      `chore(contenuti): modifica contenuto ${params.id}`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
