import { defineRouting } from "next-intl/routing";

// Italiano resta la lingua "canonica" del sito, senza prefisso di lingua
// nell'URL: preserva tutte le pagine già indicizzate da Google così come
// sono (sitemap, Search Console, backlink) invece di spostarle sotto /it.
// Le altre lingue vivono sotto un prefisso dedicato (/en, /fr, /de).
export const routing = defineRouting({
  locales: ["it", "en", "fr", "de"],
  defaultLocale: "it",
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
