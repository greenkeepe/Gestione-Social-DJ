// IndexNow: notifica a Bing (e agli altri motori che condividono lo stesso
// protocollo — Yandex, Seznam.cz, Naver) l'elenco delle pagine del sito,
// invece di aspettare che ripassino da soli a scansionarle. Un invio in
// blocco di tutte le pagine ogni settimana (dentro il ciclo dell'SEO
// Engine, vedi run-all.ts) è più che sufficiente: non serve un invio per
// ogni singola modifica.
//
// Dominio fisso invece di leggere SITE_URL/technicalBaseUrl (data/site.ts):
// questo script gira su GitHub Actions (vedi .github/workflows/seo-gsc.yml),
// non su Vercel, dove SITE_URL non è mai stato impostato — con quella
// variabile lo script sarebbe rimasto disattivato in silenzio per sempre.
// Notificare a Bing un dominio diverso da quello reale non avrebbe comunque
// senso, quindi va bene fisso qui.
//
// La chiave è pubblica per specifica del protocollo — va comunque ospitata
// in chiaro su https://<dominio>/<chiave>.txt per dimostrare la proprietà
// del sito (vedi app/<chiave>.txt/route.ts) — quindi non è un segreto da
// tenere in un env var.
import { siteRoutes } from "../../data/routes";
import { routing } from "../../i18n/routing";

const SITE_URL = "https://www.fortedj.it";
const INDEXNOW_KEY = "f0e8b6a2c4d17395a8b6c4d2e0f81739";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

function localizedPath(path: string, locale: string): string {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

async function main() {
  const urlList = siteRoutes.flatMap((route) =>
    (route.soloLocale ? [route.soloLocale] : routing.locales).map(
      (locale) => `${SITE_URL}${localizedPath(route.path, locale)}`,
    ),
  );

  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList,
    }),
  });

  if (!res.ok && res.status !== 202) {
    throw new Error(`IndexNow ha risposto ${res.status}: ${await res.text()}`);
  }

  console.log(`[seo-indexnow] Inviate ${urlList.length} URL a IndexNow (Bing/Yandex/Seznam/Naver) — risposta ${res.status}.`);
}

main().catch((err) => {
  console.error("[seo-indexnow] Errore:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
