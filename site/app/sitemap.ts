import type { MetadataRoute } from "next";
import { technicalBaseUrl } from "@/data/site";

const routes = [
  "",
  "/matrimoni",
  "/eventi",
  "/servizi",
  "/gallery",
  "/recensioni",
  "/chi-sono",
  "/faq",
  "/contatti",
  "/privacy",
  "/cookie",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${technicalBaseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
