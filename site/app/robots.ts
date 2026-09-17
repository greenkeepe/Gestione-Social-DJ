import type { MetadataRoute } from "next";
import { technicalBaseUrl } from "@/data/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${technicalBaseUrl}/sitemap.xml`,
  };
}
