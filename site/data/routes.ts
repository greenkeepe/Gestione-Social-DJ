// Elenco unico delle pagine indicizzabili del sito. Usato dalla sitemap, dal
// controllo di internal linking dell'SEO Engine e da propose-fixes.ts (per
// sapere quale chiave di messages/it.json contiene il titolo/meta
// description di ciascuna pagina, senza tenere una seconda lista che possa
// disallinearsi da generateMetadata() nelle singole page.tsx).
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
];
