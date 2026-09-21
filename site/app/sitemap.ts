import type { MetadataRoute } from "next";
import { technicalBaseUrl } from "@/data/site";
import { siteRoutes } from "@/data/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  return siteRoutes.map(({ path }) => ({
    url: `${technicalBaseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
