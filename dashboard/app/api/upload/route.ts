import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
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

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file ricevuto." }, { status: 400 });
  }
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    return NextResponse.json({ error: "Sono accettate solo immagini o video." }, { status: 400 });
  }

  const blob = await put(`media/${Date.now()}-${file.name}`, file, { access: "public" });

  try {
    await aggiornaDatiSuGitHub<MediaLibraryFile>(
      "media-library.json",
      (attuale) => {
        attuale.items.push({
          id: randomUUID(),
          url: blob.url,
          filename: file.name,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
          usatoIl: null
        });
        return attuale;
      },
      `chore(media): carica "${file.name}" dalla dashboard`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: blob.url });
}
