// Nessuna immagine reale è ancora disponibile in questo repository.
// Per popolare la gallery: aggiungere i file in public/images/gallery/
// e aggiungere qui le voci corrispondenti (mai sostituire con foto stock).

export type GalleryImage = {
  src: string;
  alt: string;
  category: "wedding" | "party" | "events";
  width: number;
  height: number;
  priority?: boolean;
};

export const galleryImages: GalleryImage[] = [];

export const galleryFilters: { label: string; value: "all" | GalleryImage["category"] }[] = [
  { label: "Tutto", value: "all" },
  { label: "Wedding", value: "wedding" },
  { label: "Party", value: "party" },
  { label: "Eventi", value: "events" },
];
