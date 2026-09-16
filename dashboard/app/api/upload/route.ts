import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub } from "../../../lib/dataSource";

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

// Il file è già su Cloudflare R2 a questo punto (caricato direttamente dal
// browser): qui riceviamo solo l'URL pubblico risultante e lo salviamo
// in data/media-library.json, che l'Agente Media legge in seguito.
export async function POST(req: Request) {
  const { url, filename, mimeType } = (await req.json()) as { url?: string; filename?: string; mimeType?: string };

  if (!url || !filename || !mimeType) {
    return NextResponse.json({ error: "Dati mancanti (url, filename, mimeType)." }, { status: 400 });
  }

  try {
    await aggiornaDatiSuGitHub<MediaLibraryFile>(
      "media-library.json",
      (attuale) => {
        attuale.items.push({
          id: randomUUID(),
          url,
          filename,
          mimeType,
          uploadedAt: new Date().toISOString(),
          usatoIl: null
        });
        return attuale;
      },
      `chore(media): carica "${filename}" dalla dashboard`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
