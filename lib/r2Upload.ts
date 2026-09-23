// Upload generico di un Buffer già in memoria su Cloudflare R2, per gli
// agenti che girano su GitHub Actions (contesto Node "puro", non la
// dashboard Next.js): stesso bucket/credenziali già usati per i Reel
// montati (vedi lib/videoTools.ts > caricaSuR2, stesso pattern con
// client.fetch di aws4fetch — funziona senza i problemi di "Content-Length"
// visti invece sul runtime fetch di Vercel).
//
// L'URL restituito NON è quello diretto di R2 (pub-xxxx.r2.dev): passa dal
// proxy della dashboard (dashboard/app/api/r2-file/[chiave]) perché il
// dominio pubblico di R2 è dichiarato "solo per test" da Cloudflare e ha un
// limite di frequenza — capitava che Meta non riuscisse a scaricare il
// video per pubblicarlo ("Unable to fetch video file from URL", visto dal
// vivo più volte). Vedi quella route per i dettagli.
import { randomUUID } from "node:crypto";
import { AwsClient } from "aws4fetch";

export async function caricaBufferSuR2(
  buffer: Buffer,
  opts: { accountId: string; accessKeyId: string; secretAccessKey: string; bucketName: string; dashboardPublicUrl: string; contentType: string; estensione: string }
): Promise<string> {
  const client = new AwsClient({ accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey, service: "s3", region: "auto" });
  const chiaveOggetto = `${randomUUID()}${opts.estensione}`;
  const endpoint = `https://${opts.accountId}.r2.cloudflarestorage.com/${opts.bucketName}/${chiaveOggetto}`;

  const res = await client.fetch(endpoint, {
    method: "PUT",
    headers: { "content-type": opts.contentType },
    body: buffer
  });
  if (!res.ok) {
    throw new Error(`Upload su Cloudflare R2 fallito (${res.status}): ${await res.text().catch(() => "")}`);
  }
  return `${opts.dashboardPublicUrl.replace(/\/$/, "")}/api/r2-file/${chiaveOggetto}`;
}
