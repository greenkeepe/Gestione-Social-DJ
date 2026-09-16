import { randomUUID } from "node:crypto";
import { AwsClient } from "aws4fetch";

// Upload diretto (server -> R2) di byte già in memoria: usato dal webhook
// Telegram, che riceve il file dai server di Telegram e non può passare dal
// flusso "presigned URL dal browser" (dashboard/lib/r2Upload.ts), pensato per
// upload diretti dal browser dell'utente.
export async function caricaBufferSuR2(buffer: Buffer, contentType: string, estensione: string): Promise<string> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicBaseUrl) {
    throw new Error(
      "Configurazione R2 mancante sul server (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME/R2_PUBLIC_BASE_URL)."
    );
  }

  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  const chiaveOggetto = `${randomUUID()}${estensione}`;
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${chiaveOggetto}`;

  // "content-length" è un header vietato dallo standard Fetch: anche
  // impostandolo a mano viene scartato in silenzio prima dell'invio. Va
  // lasciato calcolare al motore, cosa che avviene in modo affidabile solo
  // passando un Blob come corpo (con un Buffer/Uint8Array puro, su alcuni
  // runtime Node/Vercel la richiesta parte senza Content-Length e R2
  // risponde 411 "you must provide the content-length").
  const res = await client.fetch(endpoint, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: new Blob([new Uint8Array(buffer)], { type: contentType })
  });
  if (!res.ok) {
    throw new Error(`Upload su R2 fallito (${res.status}): ${await res.text()}`);
  }

  return `${publicBaseUrl.replace(/\/$/, "")}/${chiaveOggetto}`;
}
