// Diagnostica una tantum (non fa parte del ciclo normale): scarica lo stesso
// oggetto sia direttamente da R2 (firmato) sia tramite il proxy della
// dashboard (dashboard/app/api/r2-file/[chiave]), e confronta i byte. Serve
// a capire se un video che Meta rifiuta come "corrotto" lo era già
// sull'oggetto originale, o se la corruzione avviene nel proxy. Lanciata a
// mano da .github/workflows/diagnostica-media.yml, mai dal ciclo schedulato.
import { AwsClient } from "aws4fetch";
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET_NAME, DASHBOARD_PUBLIC_URL, CHIAVE } = process.env;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID || !R2_BUCKET_NAME || !DASHBOARD_PUBLIC_URL || !CHIAVE) {
  throw new Error("Variabili mancanti: servono R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_ACCOUNT_ID/R2_BUCKET_NAME/DASHBOARD_PUBLIC_URL/CHIAVE.");
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

const client = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${CHIAVE}`;

console.log(`Chiave: ${CHIAVE}`);

console.log("\n=== Scarico direttamente da R2 (richiesta firmata) ===");
const resDiretto = await client.fetch(endpoint);
if (!resDiretto.ok) throw new Error(`R2 diretto ha risposto ${resDiretto.status}: ${await resDiretto.text().catch(() => "")}`);
const bufDiretto = Buffer.from(await resDiretto.arrayBuffer());
await writeFile("/tmp/diretto.mp4", bufDiretto);
console.log(`Dimensione: ${bufDiretto.byteLength} byte`);
console.log(`sha256: ${sha256(bufDiretto)}`);

console.log("\n=== Scarico tramite il proxy della dashboard ===");
const proxyUrl = `${DASHBOARD_PUBLIC_URL.replace(/\/$/, "")}/api/r2-file/${CHIAVE}`;
console.log(`URL: ${proxyUrl}`);
const resProxy = await fetch(proxyUrl);
console.log(`Status: ${resProxy.status}`);
console.log("Header risposta:");
for (const [nome, valore] of resProxy.headers.entries()) {
  console.log(`  ${nome}: ${valore}`);
}
if (!resProxy.ok) throw new Error(`Proxy ha risposto ${resProxy.status}: ${await resProxy.text().catch(() => "")}`);
const bufProxy = Buffer.from(await resProxy.arrayBuffer());
await writeFile("/tmp/proxy.mp4", bufProxy);
console.log(`Dimensione: ${bufProxy.byteLength} byte`);
console.log(`sha256: ${sha256(bufProxy)}`);
console.log("Primi 500 caratteri del corpo (per capire se è HTML/testo invece del file):");
console.log(bufProxy.subarray(0, 500).toString("utf8"));

console.log("\n=== Confronto ===");
if (bufDiretto.equals(bufProxy)) {
  console.log("IDENTICI: il proxy consegna esattamente gli stessi byte dell'oggetto originale su R2.");
} else {
  console.log("DIVERSI: il proxy NON consegna gli stessi byte dell'oggetto originale su R2 — bug nel proxy.");
}
