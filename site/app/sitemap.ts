import type { MetadataRoute } from "next";
import { technicalBaseUrl } from "@/data/site";
import { siteRoutes } from "@/data/routes";
import { routing } from "@/i18n/routing";

function localizedPath(path: string, locale: string) {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return siteRoutes.flatMap(({ path }) =>
    routing.locales.map((locale) => ({
      url: `${technicalBaseUrl}${localizedPath(path, locale)}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: path === "" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [
            l,
            `${technicalBaseUrl}${localizedPath(path, l)}`,
          ]),
        ),
      },
    })),
  );
}
