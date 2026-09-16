// Reset totale: cancella OGNI file (foto/video/Reel) dal bucket Cloudflare
// R2 e svuota le code (media-library, reel-jobs, posts-queue) per ripartire
// da zero. Operazione distruttiva e irreversibile — va lanciata solo a mano
// da .github/workflows/svuota-media.yml (mai da un ciclo schedulato).
import "dotenv/config";
import { AwsClient } from "aws4fetch";
import { readData, writeData } from "../lib/storage.js";
import { inviaMessaggioTelegram } from "../lib/telegram.js";

interface MediaLibraryFile {
  _istruzioni: string;
  items: unknown[];
}

interface ReelJobsFile {
  _istruzioni: string;
  jobs: unknown[];
}

interface PostsQueueFile {
  _istruzioni: string;
  queue: unknown[];
}

interface ServiceLimitsFile {
  servizi: {
    r2: {
      usoAttualeBytes: number;
      oggettiAttuali: number;
      aggiornatoIl: string | null;
      pausatoIl: string | null;
    };
  };
}

async function elencaChiaviR2(client: AwsClient, accountId: string, bucketName: string): Promise<string[]> {
  const chiavi: string[] = [];
  let continuationToken: string | undefined;

  do {
    const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucketName}`);
    url.searchParams.set("list-type", "2");
    if (continuationToken) url.searchParams.set("continuation-token", continuationToken);

    const res = await client.fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Lista oggetti R2 fallita (${res.status}): ${await res.text()}`);
    }
    const xml = await res.text();

    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) {
      chiavi.push(m[1]);
    }

    const truncato = xml.match(/<IsTruncated>(true|false)<\/IsTruncated>/)?.[1] === "true";
    continuationToken = truncato ? xml.match(/<NextContinuationToken>([^<]*)<\/NextContinuationToken>/)?.[1] : undefined;
  } while (continuationToken);

  return chiavi;
}

async function main(): Promise<void> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("Configurazione R2 mancante (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME).");
  }

  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });

  console.log("Elenco tutti i file su R2...");
  const chiavi = await elencaChiaviR2(client, accountId, bucketName);
  console.log(`Trovati ${chiavi.length} file. Cancellazione in corso...`);

  let cancellati = 0;
  for (const chiave of chiavi) {
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${chiave}`;
    const res = await client.fetch(endpoint, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      cancellati++;
    } else {
      console.error(`Impossibile cancellare ${chiave}: ${res.status} ${await res.text()}`);
    }
  }
  console.log(`Cancellati ${cancellati}/${chiavi.length} file da R2.`);

  const mediaLibrary = await readData<MediaLibraryFile>("media-library.json");
  mediaLibrary.items = [];
  await writeData("media-library.json", mediaLibrary);

  const reelJobs = await readData<ReelJobsFile>("reel-jobs.json");
  reelJobs.jobs = [];
  await writeData("reel-jobs.json", reelJobs);

  const postsQueue = await readData<PostsQueueFile>("posts-queue.json");
  postsQueue.queue = [];
  await writeData("posts-queue.json", postsQueue);

  const limiti = await readData<ServiceLimitsFile>("service-limits.json");
  limiti.servizi.r2.usoAttualeBytes = 0;
  limiti.servizi.r2.oggettiAttuali = 0;
  limiti.servizi.r2.aggiornatoIl = new Date().toISOString();
  limiti.servizi.r2.pausatoIl = null;
  await writeData("service-limits.json", limiti);

  console.log("Media library, reel jobs, coda post e uso R2 azzerati. Il published-log.json (storico di quanto è già uscito sui social) NON è stato toccato.");

  await inviaMessaggioTelegram(
    `🗑️ Reset completato: cancellati ${cancellati} file da R2 e svuotate le code (media, Reel, post). Si riparte da zero — puoi ricominciare a mandarmi foto/video su Telegram o dalla dashboard.`
  );
}

main().catch(async (err) => {
  console.error("Errore durante il reset:", err);
  await inviaMessaggioTelegram(`⚠️ Reset media fallito: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
