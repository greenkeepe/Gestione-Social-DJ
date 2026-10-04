// Elenco unico delle pagine indicizzabili del sito. Usato dalla sitemap, dal
// controllo di internal linking dell'SEO Engine e da propose-fixes.ts (per
// sapere quale chiave di messages/it.json contiene il titolo/meta
// description di ciascuna pagina, senza tenere una seconda lista che possa
// disallinearsi da generateMetadata() nelle singole page.tsx).
import { cities } from "./cities";

export interface SiteRoute {
  path: string;
  label: string;
  // Namespace i18n (vedi messages/it.json) e chiavi del titolo/meta
  // description di questa pagina. metaDescriptionKey è null quando la
  // pagina compone la description in altro modo (es. ChiSonoPage usa "bio"
  // con placeholder interpolati, non sicura da riscrivere alla cieca).
  metaNamespace: string;
  metaTitleKey: string;
  metaDescriptionKey: string | null;
  // Pagina che esiste in una sola lingua (es. le pagine locali "DJ a
  // <città>", solo in italiano): sitemap e controllo indicizzazione non
  // generano gli indirizzi nelle altre lingue.
  soloLocale?: "it";
  // File che linkano la pagina con un indirizzo costruito dal codice (non
  // riconoscibile dallo scanner dei link interni, che legge solo href fissi).
  linkedVia?: string[];
}

export const siteRoutes: SiteRoute[] = [
  { path: "", label: "Home", metaNamespace: "Metadata", metaTitleKey: "homeTitle", metaDescriptionKey: "homeDescription" },
  { path: "/matrimoni", label: "Matrimoni", metaNamespace: "MatrimoniPage", metaTitleKey: "metaTitle", metaDescriptionKey: "metaDescription" },
  { path: "/eventi", label: "Eventi", metaNamespace: "EventiPage", metaTitleKey: "metaTitle", metaDescriptionKey: "metaDescription" },
  { path: "/servizi", label: "Servizi", metaNamespace: "ServiziPage", metaTitleKey: "metaTitle", metaDescriptionKey: "metaDescription" },
  { path: "/gallery", label: "Gallery", metaNamespace: "GalleryPage", metaTitleKey: "metaTitle", metaDescriptionKey: "metaDescription" },
  { path: "/recensioni", label: "Recensioni", metaNamespace: "RecensioniPage", metaTitleKey: "metaTitle", metaDescriptionKey: "metaDescription" },
  { path: "/chi-sono", label: "Chi è Forte DJ", metaNamespace: "ChiSonoPage", metaTitleKey: "metaTitle", metaDescriptionKey: null },
  { path: "/faq", label: "FAQ", metaNamespace: "FaqPage", metaTitleKey: "metaTitle", metaDescriptionKey: "metaDescription" },
  { path: "/contatti", label: "Contatti", metaNamespace: "ContattiPage", metaTitleKey: "metaTitle", metaDescriptionKey: "metaDescription" },
  { path: "/privacy", label: "Privacy", metaNamespace: "PrivacyPage", metaTitleKey: "metaTitle", metaDescriptionKey: "metaDescription" },
  { path: "/cookie", label: "Cookie", metaNamespace: "CookiePage", metaTitleKey: "metaTitle", metaDescriptionKey: "metaDescription" },
  // Pagine locali "DJ a <città>" (data/cities.ts), solo in italiano
  ...cities.map(
    (c): SiteRoute => ({
      path: `/dj/${c.slug}`,
      label: `DJ a ${c.nome}`,
      metaNamespace: "CittaPages",
      metaTitleKey: `${c.chiave}MetaTitle`,
      metaDescriptionKey: `${c.chiave}MetaDescription`,
      soloLocale: "it",
      linkedVia: ["components/sections/ZoneServite.tsx", "app/[locale]/dj/[citta]/page.tsx"],
    }),
  ),
];
