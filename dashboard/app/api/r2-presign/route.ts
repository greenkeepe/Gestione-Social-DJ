import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { AwsClient } from "aws4fetch";
import { r2Pausato } from "../../../lib/serviceLimits";

export const runtime = "nodejs";

// Genera un URL "presigned" (valido pochi minuti) per caricare UN file
// direttamente dal browser dentro il bucket Cloudflare R2, senza far
// transitare i byte del video attraverso Vercel: il browser fa poi una PUT
// diretta a quell'URL (vedi dashboard/lib/r2Upload.ts). Le credenziali R2
// restano sempre lato server, non arrivano mai al browser.
export async function POST(req: Request) {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicBaseUrl) {
    return NextResponse.json(
      { error: "Configurazione R2 mancante sul server (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME/R2_PUBLIC_BASE_URL)." },
      { status: 500 }
    );
  }

  const { filename, contentType } = (await req.json()) as { filename?: string; contentType?: string };
  if (!filename || !contentType) {
    return NextResponse.json({ error: "Dati mancanti (filename, contentType)." }, { status: 400 });
  }

  if (await r2Pausato()) {
    return NextResponse.json(
      { error: "Spazio R2 esaurito (soglia superata): libera spazio o alza la soglia dalla pagina \"Utilizzo servizi\" prima di caricare altro." },
      { status: 507 }
    );
  }

  const estensione = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
  const chiaveOggetto = `${randomUUID()}${estensione}`;

  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${chiaveOggetto}`;

  const richiestaFirmata = await client.sign(endpoint, {
    method: "PUT",
    headers: { "content-type": contentType },
    aws: { signQuery: true }
  });

  const publicUrl = `${publicBaseUrl.replace(/\/$/, "")}/${chiaveOggetto}`;

  return NextResponse.json({ uploadUrl: richiestaFirmata.url, publicUrl });
}
