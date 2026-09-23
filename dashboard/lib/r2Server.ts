import { randomUUID } from "node:crypto";
import https from "node:https";
import { AwsClient } from "aws4fetch";

// Upload diretto (server -> R2) di byte già in memoria: usato dal webhook
// Telegram, che riceve il file dai server di Telegram e non può passare dal
// flusso "presigned URL dal browser" (dashboard/lib/r2Upload.ts), pensato per
// upload diretti dal browser dell'utente.
//
// Firmiamo la richiesta con aws4fetch (client.sign, senza corpo: per S3/R2
// basta l'header "X-Amz-Content-Sha256: UNSIGNED-PAYLOAD" che aws4fetch
// imposta da solo) ma la inviamo con il modulo https di Node, non con
// fetch(): "Content-Length" è un header "vietato" dallo standard Fetch —
// anche impostandolo a mano viene scartato in silenzio prima dell'invio,
// qualunque forma abbia il corpo (Buffer, Uint8Array o Blob, provati tutti
// sul runtime Node di Vercel) — e R2 risponde sempre 411
// "MissingContentLength" senza. Con https.request() lo controlliamo noi
// direttamente: nessuna restrizione, nessuna sorpresa.
export async function caricaBufferSuR2(buffer: Buffer, contentType: string, estensione: string): Promise<string> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const dashboardPublicUrl = process.env.DASHBOARD_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !dashboardPublicUrl) {
    throw new Error(
      "Configurazione R2 mancante sul server (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME/DASHBOARD_PUBLIC_URL)."
    );
  }

  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  const chiaveOggetto = `${randomUUID()}${estensione}`;
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${chiaveOggetto}`;

  const signedRequest = await client.sign(endpoint, {
    method: "PUT",
    headers: { "content-type": contentType }
  });

  const headers: Record<string, string> = { "content-length": String(buffer.byteLength) };
  signedRequest.headers.forEach((value, key) => {
    headers[key] = value;
  });

  await new Promise<void>((resolve, reject) => {
    const req = https.request(endpoint, { method: "PUT", headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const status = res.statusCode ?? 0;
        if (status >= 200 && status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload su R2 fallito (${status}): ${Buffer.concat(chunks).toString("utf-8")}`));
        }
      });
    });
    req.on("error", reject);
    req.end(buffer);
  });

  return `${dashboardPublicUrl.replace(/\/$/, "")}/api/r2-file/${chiaveOggetto}`;
}

// Elimina l'oggetto corrispondente a un URL R2 (es. quando cancelli un media
// dalla dashboard, per non lasciare file "orfani" a occupare spazio nel
// piano gratuito). Best-effort: non blocca mai la cancellazione del
// riferimento nei dati se il file non esiste più o R2 non è raggiungibile.
// Riconosce sia il nuovo formato (proxy dashboard, /api/r2-file/<chiave>)
// sia il vecchio URL diretto R2_PUBLIC_BASE_URL dei media caricati prima di
// questo cambio, ancora presenti in media-library.json.
export async function eliminaOggettoR2(url: string): Promise<void> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const dashboardPublicUrl = process.env.DASHBOARD_PUBLIC_URL;
  const vecchioPublicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) return;

  const prefissoNuovo = dashboardPublicUrl ? `${dashboardPublicUrl.replace(/\/$/, "")}/api/r2-file/` : null;
  const prefissoVecchio = vecchioPublicBaseUrl ? `${vecchioPublicBaseUrl.replace(/\/$/, "")}/` : null;

  let chiaveOggetto: string | null = null;
  if (prefissoNuovo && url.startsWith(prefissoNuovo)) chiaveOggetto = url.slice(prefissoNuovo.length);
  else if (prefissoVecchio && url.startsWith(prefissoVecchio)) chiaveOggetto = url.slice(prefissoVecchio.length);
  if (!chiaveOggetto) return; // non è un file nostro su R2 (es. un vecchio URL Cloudinary)

  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${chiaveOggetto}`;
  const signedRequest = await client.sign(endpoint, { method: "DELETE" });
  const headers: Record<string, string> = {};
  signedRequest.headers.forEach((value, key) => {
    headers[key] = value;
  });

  await new Promise<void>((resolve) => {
    const req = https.request(endpoint, { method: "DELETE", headers }, (res) => {
      res.resume();
      res.on("end", resolve);
    });
    req.on("error", () => resolve()); // best-effort: un errore qui non deve bloccare nulla
    req.end();
  });
}
