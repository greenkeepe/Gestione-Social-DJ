import { NextResponse } from "next/server";
import { leggiDati, aggiornaDatiSuGitHub } from "../../../../../lib/dataSource";
import type { ReelJobsFile } from "../../../../../lib/types";

export const runtime = "nodejs";

interface MediaLibraryFile {
  items: Array<{
    id: string;
    url: string;
    filename: string;
    mimeType: string;
    uploadedAt: string;
    usatoIl: string | null;
  }>;
}

// Il Reel è già pronto (renderizzato dal Regista e caricato su Cloudinary):
// qui lo "consegniamo" alla pipeline già esistente aggiungendolo a
// data/media-library.json, esattamente come un media caricato a mano dalla
// pagina "Carica media". Da qui in poi lo gestiscono gli agenti già
// esistenti (Occhio -> Copy -> Editore): nessuna pubblicazione duplicata.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const jobsFile = await leggiDati<ReelJobsFile>("reel-jobs.json");
    const job = jobsFile.jobs.find((j) => j.id === params.id);
    if (!job) return NextResponse.json({ error: "Job non trovato." }, { status: 404 });
    if (job.status !== "pronto" || !job.risultato) {
      return NextResponse.json({ error: "Il Reel non è ancora pronto." }, { status: 400 });
    }

    const filename = `reel-${job.filename.replace(/\.[^.]+$/, "")}.mp4`;

    // 1) Aggiungiamo PRIMA il Reel alla libreria media: se il secondo passo
    // (segnare il job come "usato") dovesse fallire, al peggio si ripreme il
    // pulsante — non si rischia di perdere il riferimento al Reel già pronto.
    await aggiornaDatiSuGitHub<MediaLibraryFile>(
      "media-library.json",
      (attuale) => {
        attuale.items.push({
          id: params.id,
          url: job.risultato!.reelUrl,
          filename,
          mimeType: "video/mp4",
          uploadedAt: new Date().toISOString(),
          usatoIl: null
        });
        return attuale;
      },
      `chore(media): aggiungi Reel AI "${filename}" alla libreria`
    );

    // 2) Solo ora marchiamo il job come "usato".
    await aggiornaDatiSuGitHub<ReelJobsFile>(
      "reel-jobs.json",
      (attuale) => {
        const j = attuale.jobs.find((x) => x.id === params.id);
        if (j) {
          j.status = "usato";
          j.aggiornatoIl = new Date().toISOString();
        }
        return attuale;
      },
      `chore(reel-ai): job ${params.id} usato per un post`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
