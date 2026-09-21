import type { MetadataRoute } from "next";
import { technicalBaseUrl } from "@/data/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Dashboard interna dell'SEO Engine: già protetta da Basic Auth
      // (proxy.ts) e da noindex, esclusa anche qui per sicurezza.
      disallow: "/admin",
    },
    sitemap: `${technicalBaseUrl}/sitemap.xml`,
  };
}
