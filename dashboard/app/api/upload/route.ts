import { randomUUID } from "node:crypto";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
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

// Upload "diretto dal browser" a Vercel Blob: il file non passa più dalla
// nostra funzione serverless (che ha un limite di ~4.5MB), va dritto allo
// storage. Questa route genera solo il token di autorizzazione e, a
// caricamento completato, salva l'informazione nel repository.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ["image/*", "video/*"],
          addRandomSuffix: true
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const filename = tokenPayload ? JSON.parse(tokenPayload).filename : blob.pathname;
        const mimeType = tokenPayload ? JSON.parse(tokenPayload).mimeType : blob.contentType;

        await aggiornaDatiSuGitHub<MediaLibraryFile>(
          "media-library.json",
          (attuale) => {
            attuale.items.push({
              id: randomUUID(),
              url: blob.url,
              filename,
              mimeType,
              uploadedAt: new Date().toISOString(),
              usatoIl: null
            });
            return attuale;
          },
          `chore(media): carica "${filename}" dalla dashboard`
        );
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
