import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub } from "../../../../lib/dataSource";
import { eliminaOggettoR2 } from "../../../../lib/r2Server";

export const runtime = "nodejs";

interface MediaLibraryFile {
  _istruzioni: string;
  items: Array<{
    id: string;
    url: string;
    filename: string;
    mimeType: string;
    uploadedAt: string;
    usatoIl: string | null;
  }>;
}

// Elimina un media dalla libreria (pagina "Carica media"): usato per
// togliere test/errori/contenuti che non vuoi più che gli agenti pescassero.
// Elimina anche il file su R2 (se è nostro), per non pagare storage inutile.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  let urlDaEliminare: string | null = null;

  try {
    await aggiornaDatiSuGitHub<MediaLibraryFile>(
      "media-library.json",
      (attuale) => {
        const item = attuale.items.find((i) => i.id === params.id);
        urlDaEliminare = item?.url ?? null;
        attuale.items = attuale.items.filter((i) => i.id !== params.id);
        return attuale;
      },
      `chore(media): elimina media ${params.id}`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  if (urlDaEliminare) {
    await eliminaOggettoR2(urlDaEliminare).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
