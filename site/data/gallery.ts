// Foto reali fornite direttamente da Andrea (Forte DJ), tratte da eventi
// realmente animati da lui. Nessuna foto stock. La categoria "events"
// (aziendali) non ha ancora scatti reali: finché non arrivano, la Gallery
// mostra un placeholder editoriale solo per quel filtro (vedi Gallery.tsx).

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
];

export const galleryFilters: { label: string; value: "all" | GalleryImage["category"] }[] = [
  { label: "Tutto", value: "all" },
  { label: "Wedding", value: "wedding" },
  { label: "Party", value: "party" },
  { label: "Eventi", value: "events" },
];
