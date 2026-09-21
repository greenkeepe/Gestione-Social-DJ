// Elenco unico delle pagine indicizzabili del sito. Usato sia dalla sitemap
// sia dal controllo di internal linking dell'SEO Engine, per non tenere due
// liste separate che possono disallinearsi.
export interface SiteRoute {
  path: string;
  label: string;
}

export const siteRoutes: SiteRoute[] = [
  { path: "", label: "Home" },
  { path: "/matrimoni", label: "Matrimoni" },
  { path: "/eventi", label: "Eventi" },
  { path: "/servizi", label: "Servizi" },
  { path: "/gallery", label: "Gallery" },
  { path: "/recensioni", label: "Recensioni" },
  { path: "/chi-sono", label: "Chi è Forte DJ" },
  { path: "/faq", label: "FAQ" },
  { path: "/contatti", label: "Contatti" },
  { path: "/privacy", label: "Privacy" },
  { path: "/cookie", label: "Cookie" },
];
