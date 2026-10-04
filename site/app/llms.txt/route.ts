import { NextResponse } from "next/server";
import { siteRoutes } from "@/data/routes";
import { siteConfig, technicalBaseUrl } from "@/data/site";
import it from "../../messages/it.json";

// Proposta emergente (llmstxt.org): un riassunto in markdown semplice delle
// pagine principali, pensato per essere letto da un LLM invece che
// indicizzato come una normale pagina — non sostituisce sitemap/robots, li
// affianca. Generato dalle stesse fonti di sitemap.ts/i18n (site/data/routes.ts,
// site/data/site.ts, messages/it.json): niente testo duplicato da tenere
// allineato a mano, se cambia una pagina questo file cambia da solo al
// prossimo deploy.
export const dynamic = "force-static";

type Messaggi = Record<string, Record<string, string>>;

function descrizionePagina(route: (typeof siteRoutes)[number]): string {
  const namespace = (it as unknown as Messaggi)[route.metaNamespace] ?? {};
  if (route.metaDescriptionKey && namespace[route.metaDescriptionKey]) {
    return namespace[route.metaDescriptionKey];
  }
  return namespace[route.metaTitleKey] ?? route.label;
}

const PAGINE_PRINCIPALI = siteRoutes.filter(
  (r) => !r.soloLocale && r.path !== "/privacy" && r.path !== "/cookie",
);
const PAGINE_CITTA = siteRoutes.filter((r) => r.soloLocale === "it");

export async function GET() {
  const righe: string[] = [];

  righe.push(`# ${siteConfig.name}`);
  righe.push("");
  righe.push(`> ${siteConfig.description}`);
  righe.push("");
  righe.push(
    `Sito ufficiale di ${siteConfig.artistName} (${siteConfig.realName}), DJ professionista per matrimoni ed eventi da oltre ${siteConfig.yearsExperience} anni, ${siteConfig.eventsCount} eventi realizzati, ${siteConfig.reviewsCount} recensioni verificate a ${siteConfig.ratingValue} stelle. Zona servita: ${siteConfig.serviceAreas.join(", ")} (base a ${siteConfig.baseLocation}, raggio indicativo ${siteConfig.serviceRadius}). Contatti: ${siteConfig.email}, ${siteConfig.phone}.`,
  );
  righe.push("");

  righe.push("## Pagine principali");
  righe.push("");
  for (const route of PAGINE_PRINCIPALI) {
    righe.push(`- [${route.label}](${technicalBaseUrl}${route.path}): ${descrizionePagina(route)}`);
  }
  righe.push("");

  if (PAGINE_CITTA.length > 0) {
    righe.push("## Pagine per città (area servita)");
    righe.push("");
    for (const route of PAGINE_CITTA) {
      righe.push(`- [${route.label}](${technicalBaseUrl}${route.path}): ${descrizionePagina(route)}`);
    }
    righe.push("");
  }

  righe.push("## Note");
  righe.push("");
  righe.push(
    "- Nessun listino prezzi fisso pubblicato: ogni preventivo è personalizzato in base a data, location e servizi richiesti — vedi la pagina Contatti.",
  );
  righe.push(`- Sitemap completa: ${technicalBaseUrl}/sitemap.xml`);
  righe.push("");

  return new NextResponse(righe.join("\n"), {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
