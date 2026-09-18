// Foto reali fornite direttamente da Andrea (Forte DJ), tratte da eventi
// realmente animati da lui. Nessuna foto stock.

export type GalleryImage = {
  src: string;
  alt: string;
  category: "wedding" | "party" | "events";
  width: number;
  height: number;
  priority?: boolean;
};

export const galleryImages: GalleryImage[] = [
  {
    src: "/images/gallery/wedding-ceremony-chairs.jpg",
    alt: "Allestimento della cerimonia con vista sulle colline",
    category: "wedding",
    width: 2200,
    height: 1650,
    priority: true,
  },
  {
    src: "/images/gallery/wedding-couple-goldenhour.jpg",
    alt: "Sposi in terrazza al tramonto",
    category: "wedding",
    width: 1500,
    height: 2000,
  },
  {
    src: "/images/gallery/wedding-sparklers-dance.jpg",
    alt: "Primo ballo degli sposi tra le stelle filanti",
    category: "wedding",
    width: 1800,
    height: 1012,
  },
  {
    src: "/images/gallery/wedding-bride-celebration.jpg",
    alt: "La sposa festeggia sulla pista da ballo",
    category: "wedding",
    width: 2000,
    height: 1500,
  },
  {
    src: "/images/gallery/party-indoor-dancefloor.jpg",
    alt: "Pista da ballo animata durante una festa privata",
    category: "party",
    width: 788,
    height: 1400,
  },
  {
    src: "/images/gallery/wedding-firstdance-twirl.jpg",
    alt: "Sposi che ballano circondati dagli invitati",
    category: "wedding",
    width: 1500,
    height: 2000,
  },
  {
    src: "/images/gallery/party-foggy-dancefloor.jpg",
    alt: "Pista da ballo tra luci e fumo scenico",
    category: "party",
    width: 1800,
    height: 1012,
  },
  {
    src: "/images/gallery/wedding-garden-lights.jpg",
    alt: "Balli in giardino tra le luci sospese",
    category: "wedding",
    width: 1800,
    height: 1012,
  },
  {
    src: "/images/gallery/wedding-reception-dance.jpg",
    alt: "Balli al ricevimento con luci scenografiche",
    category: "wedding",
    width: 2000,
    height: 1500,
  },
  {
    src: "/images/gallery/party-tent-dancefloor.jpg",
    alt: "Festa sotto il tendone con luci colorate",
    category: "party",
    width: 1800,
    height: 1012,
  },
  {
    src: "/images/gallery/events-corporate-buffet.jpg",
    alt: "Console DJ durante un evento aziendale con buffet",
    category: "events",
    width: 1080,
    height: 810,
  },
  {
    src: "/images/gallery/events-garden-dinner.jpg",
    alt: "Cena di gala in giardino con console DJ in primo piano",
    category: "events",
    width: 2000,
    height: 1500,
  },
  {
    src: "/images/gallery/wedding-terrace-booth-hills.jpg",
    alt: "Consolle allestita in terrazza con vista sulle colline",
    category: "wedding",
    width: 2000,
    height: 1500,
  },
  {
    src: "/images/gallery/party-dj-smoke-garden.jpg",
    alt: "DJ set in giardino tra le luci e il fumo scenico",
    category: "party",
    width: 1600,
    height: 1149,
  },
  {
    src: "/images/gallery/party-nightclub-518.jpg",
    alt: "Festa in discoteca con la pista animata",
    category: "party",
    width: 1800,
    height: 1350,
  },
  {
    src: "/images/gallery/party-terrace-dinner-lights.jpg",
    alt: "Cena in terrazza tra le luci sospese e la consolle",
    category: "party",
    width: 2000,
    height: 1500,
  },
  {
    src: "/images/gallery/party-pool-night.jpg",
    alt: "Consolle allestita a bordo piscina in notturna",
    category: "party",
    width: 1800,
    height: 1350,
  },
  {
    src: "/images/gallery/wedding-poolside-console-view.jpg",
    alt: "Consolle a bordo piscina con vista sulle colline",
    category: "wedding",
    width: 2000,
    height: 1500,
  },
  {
    src: "/images/gallery/wedding-coldspark-cake.jpg",
    alt: "Taglio della torta tra i fuochi freddi",
    category: "wedding",
    width: 1350,
    height: 1800,
  },
  {
    src: "/images/gallery/wedding-aperitivo-garden.jpg",
    alt: "Aperitivo in giardino sotto la magnolia",
    category: "wedding",
    width: 2000,
    height: 1500,
  },
  {
    src: "/images/gallery/wedding-ceremony-arch-hills.jpg",
    alt: "Cerimonia con arco floreale e vista sulle colline",
    category: "wedding",
    width: 2000,
    height: 1500,
  },
  {
    src: "/images/gallery/wedding-booth-jasmine.jpg",
    alt: "Consolle allestita tra i fiori di gelsomino",
    category: "wedding",
    width: 2000,
    height: 1500,
  },
  {
    src: "/images/gallery/wedding-circle-dance.jpg",
    alt: "Girotondo di invitati sulla pista da ballo",
    category: "wedding",
    width: 1800,
    height: 1012,
  },
  {
    src: "/images/gallery/wedding-group-hug.jpg",
    alt: "Invitati abbracciati durante la festa",
    category: "wedding",
    width: 1800,
    height: 1012,
  },
  {
    src: "/images/gallery/wedding-courtyard-dance.jpg",
    alt: "Balli nel cortile tra le luci sospese",
    category: "wedding",
    width: 1800,
    height: 1012,
  },
  {
    src: "/images/gallery/party-indoor-handsup.jpg",
    alt: "Pista da ballo al coperto con le mani alzate",
    category: "party",
    width: 1800,
    height: 1350,
  },
  {
    src: "/images/gallery/party-tent-nightdance.jpg",
    alt: "Festa sotto il tendone in notturna",
    category: "party",
    width: 1800,
    height: 1012,
  },
  {
    src: "/images/gallery/party-terrace-seaview.jpg",
    alt: "Festa in terrazza con vista sul mare",
    category: "party",
    width: 1800,
    height: 1012,
  },
  {
    src: "/images/gallery/events-gala-tent.jpg",
    alt: "Aperitivo di gala sotto il gazebo con lampadari",
    category: "events",
    width: 2000,
    height: 1500,
  },
];

export const galleryFilters: { label: string; value: "all" | GalleryImage["category"] }[] = [
  { label: "Tutto", value: "all" },
  { label: "Wedding", value: "wedding" },
  { label: "Party", value: "party" },
  { label: "Eventi", value: "events" },
];
