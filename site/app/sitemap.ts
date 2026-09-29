import type { MetadataRoute } from "next";
import { technicalBaseUrl } from "@/data/site";
import { siteRoutes } from "@/data/routes";
import { routing } from "@/i18n/routing";

function localizedPath(path: string, locale: string) {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return siteRoutes.flatMap(({ path, soloLocale }) => {
    // pagine in una sola lingua (es. "DJ a <città>"): nessuna versione tradotta
    const locales = soloLocale ? [soloLocale] : routing.locales;
    return locales.map((locale) => ({
      url: `${technicalBaseUrl}${localizedPath(path, locale)}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.7,
      ...(soloLocale
        ? {}
        : {
            alternates: {
              languages: Object.fromEntries(
                routing.locales.map((l) => [
                  l,
                  `${technicalBaseUrl}${localizedPath(path, l)}`,
                ]),
              ),
            },
          }),
    }));
  });
}
