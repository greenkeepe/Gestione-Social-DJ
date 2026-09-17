// Contenuti sincronizzati manualmente da config/brand.json (radice del repo).
// Nessun dato qui è inventato: aggiornare prima brand.json, poi riportare qui.

export const siteConfig = {
  name: "Forte DJ",
  artistName: "Forte DJ",
  realName: "Andrea",
  description:
    "Forte DJ è DJ per matrimoni ed eventi in Piemonte, Liguria e Lombardia: musica su misura, impianto audio, luci e regia dell'atmosfera per cerimonie, ricevimenti, compleanni ed eventi aziendali.",
  tagline:
    "DJ & Entertainment per matrimoni, eventi e party che meritano di essere ricordati.",

  // Lasciare vuoto finché non esiste un dominio reale: non va inventato.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "",

  email: "info.andreaforte@gmail.com",
  phone: "+39 366 744 7280",
  phoneHref: "tel:+393667447280",

  // Numero verificato in config/brand.json (contatti.whatsappBottoneAttivo: true).
  whatsappNumber: "393667447280",
  whatsappHref: "https://wa.me/393667447280",

  instagramUrl: "https://www.instagram.com/forte_dj/",
  instagramHandle: "@forte_dj",
  // Nessuna URL verificata per Facebook/TikTok/YouTube in brand.json: restano vuote e nascoste.
  facebookUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",

  musiquaProfileUrl:
    "https://www.musiqua.it/band/forte-dj-eventi-e-matrimoni-14006",
  musiquaWidgetSrc:
    "https://www.musiqua.it/widget/reviews/forte-dj-eventi-e-matrimoni-14006.js",

  yearsExperience: "20",
  eventsCount: "200+",
  // Numero di recensioni verificate presenti in config/brand.json (testimonianze[]).
  reviewsCount: 78,

  baseLocation: "Serravalle Scrivia (AL)",
  serviceRadius: "150 km",
  serviceAreas: ["Piemonte", "Liguria", "Lombardia"],
} as const;

// Base tecnica per risolvere URL assoluti (OG image, sitemap) quando manca un dominio reale.
export const technicalBaseUrl =
  siteConfig.url ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
