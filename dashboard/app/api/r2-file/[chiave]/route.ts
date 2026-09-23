import { NextRequest, NextResponse } from "next/server";
import { AwsClient } from "aws4fetch";

export const runtime = "nodejs";
export const maxDuration = 60;

// Fa da tramite tra Meta (Instagram/Facebook, quando scaricano un media per
// pubblicarlo) e il bucket R2: prima davamo a Meta direttamente l'URL
// pubblico "pub-xxxx.r2.dev", ma quel dominio è dichiarato da Cloudflare
// "solo per test" e ha un limite di frequenza — capitava che il fetch di
// Meta fallisse ("Unable to fetch video file from URL", visto dal vivo più
// volte). Passando da un dominio Vercel "vero" il limite non c'è più. Bonus:
// il bucket R2 può restare privato, non serve più l'accesso pubblico.
//
// Inoltra l'header Range (e la relativa risposta 206/Content-Range): Meta
// scarica i video a pezzi, senza supporto a Range il fetch fallirebbe sui
// file più grandi.
const CHIAVE_VALIDA = /^[a-zA-Z0-9-]{1,100}\.[a-zA-Z0-9]{1,10}$/;

const HEADER_DA_INOLTRARE = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"];

export async function GET(req: NextRequest, { params }: { params: { chiave: string } }) {
  const { chiave } = params;
  if (!CHIAVE_VALIDA.test(chiave)) {
    return NextResponse.json({ error: "Chiave media non valida." }, { status: 400 });
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return NextResponse.json({ error: "Configurazione R2 mancante sul server." }, { status: 500 });
  }

  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${chiave}`;

  const range = req.headers.get("range");
  const upstream = await client.fetch(endpoint, {
    method: "GET",
    headers: range ? { range } : {}
  });

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json(
      { error: `File non trovato su R2 (${upstream.status}).` },
      { status: upstream.status === 404 ? 404 : 502 }
    );
  }

  const headers = new Headers();
  for (const nome of HEADER_DA_INOLTRARE) {
    const valore = upstream.headers.get(nome);
    if (valore) headers.set(nome, valore);
  }
  if (!headers.has("accept-ranges")) headers.set("accept-ranges", "bytes");
  // "immutable, max-age=31536000" (un anno) sembrava una scelta sicura dato
  // che ogni chiave R2 è un UUID nuovo che non cambia mai — ma se anche una
  // sola risposta viene messa in cache mentre è già danneggiata (visto dal
  // vivo: il bug del troncamento qui sopra), resta bloccata così per un
  // anno intero, a prescindere da qualunque correzione lato codice. 5
  // minuti bastano per gli utilizzi reali (Meta scarica il media subito
  // dopo che gli passiamo l'URL, non lo ririchiede a distanza di giorni) e
  // limitano il danno di una futura risposta cattiva a pochi minuti invece
  // che a un anno.
  headers.set("cache-control", "public, max-age=300");

  // Bug reale trovato dal vivo: passare "upstream.body" (uno stream) come
  // corpo della risposta troncava il file a pochi KB — sempre, non solo sui
  // file grandi — perché il runtime serverless di Vercel può chiudere la
  // funzione (e quindi lo stream in corso) prima che finisca di scorrere
  // tutti i byte. Un'immagine da 726 KB arrivava a Meta come 5,7 KB,
  // rifiutata con "formato non riconosciuto"/"file corrotto" — la stessa
  // causa, con messaggi diversi, di più errori di pubblicazione visti in
  // giornata. Bufferizzare l'intera risposta (o il singolo "pezzo" quando
  // Meta chiede un Range, quindi comunque limitato) prima di restituirla
  // elimina la dipendenza dal completamento dello stream in background.
  const buffer = await upstream.arrayBuffer();
  return new NextResponse(buffer, { status: upstream.status, headers });
}
