// Misura reale dello spazio occupato nel bucket Cloudflare R2 (piano
// gratuito: 10GB), usata dall'Agente Analytics per tenere aggiornata la
// pagina dashboard "Utilizzo servizi". Nessuna libreria XML aggiuntiva:
// la risposta di ListObjectsV2 è XML semplice e prevedibile, ne estraiamo
// solo i tag che servono con una regex.
import { AwsClient } from "aws4fetch";

export interface UsoR2 {
  bytes: number;
  oggetti: number;
}

export async function misuraUsoR2(opts: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}): Promise<UsoR2> {
  const client = new AwsClient({ accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey, service: "s3", region: "auto" });

  let bytes = 0;
  let oggetti = 0;
  let continuationToken: string | undefined;

  do {
    const url = new URL(`https://${opts.accountId}.r2.cloudflarestorage.com/${opts.bucketName}`);
    url.searchParams.set("list-type", "2");
    if (continuationToken) url.searchParams.set("continuation-token", continuationToken);

    const res = await client.fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Lista oggetti R2 fallita (${res.status}): ${await res.text()}`);
    }
    const xml = await res.text();

    for (const m of xml.matchAll(/<Size>(\d+)<\/Size>/g)) {
      bytes += Number(m[1]);
      oggetti++;
    }

    const truncato = xml.match(/<IsTruncated>(true|false)<\/IsTruncated>/)?.[1] === "true";
    continuationToken = truncato ? xml.match(/<NextContinuationToken>([^<]*)<\/NextContinuationToken>/)?.[1] : undefined;
  } while (continuationToken);

  return { bytes, oggetti };
}
