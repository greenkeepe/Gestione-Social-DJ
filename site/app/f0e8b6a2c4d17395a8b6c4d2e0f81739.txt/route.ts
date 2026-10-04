import { NextResponse } from "next/server";

// File di verifica IndexNow (vedi scripts/seo/submit-indexnow.ts): deve
// rispondere con la chiave in chiaro su https://<dominio>/<chiave>.txt per
// dimostrare la proprietà del sito a Bing/Yandex/Seznam/Naver. Il nome
// della cartella (la chiave stessa) e il testo qui sotto devono restare
// identici a INDEXNOW_KEY nello script — se la chiave cambia, vanno
// aggiornati insieme.
export const dynamic = "force-static";

export async function GET() {
  return new NextResponse("f0e8b6a2c4d17395a8b6c4d2e0f81739", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
