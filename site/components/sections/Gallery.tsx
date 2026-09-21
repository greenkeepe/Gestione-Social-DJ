"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Lightbox } from "@/components/ui/Lightbox";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { cn } from "@/lib/utils";
import { galleryImages, galleryFilters, type GalleryImage } from "@/data/gallery";

// Struttura pronta per il portfolio reale: finché non arrivano le foto,
// occupa gli stessi slot con placeholder chiaramente etichettati (mai
// spacciati per eventi reali) e con la stessa variazione di formati di una
// vera gallery editoriale (verticale/orizzontale/quadrata).
const placeholderSlots: { category: GalleryImage["category"]; aspect: string }[] = [
  { category: "wedding", aspect: "aspect-[3/4]" },
  { category: "party", aspect: "aspect-square" },
  { category: "events", aspect: "aspect-[4/5]" },
  { category: "wedding", aspect: "aspect-[4/5]" },
  { category: "party", aspect: "aspect-[3/4]" },
  { category: "wedding", aspect: "aspect-square" },
  { category: "events", aspect: "aspect-[3/4]" },
  { category: "party", aspect: "aspect-[4/5]" },
  { category: "events", aspect: "aspect-square" },
];

export function Gallery({
  full = false,
  hideHeading = false,
}: {
  full?: boolean;
  hideHeading?: boolean;
}) {
  const [filter, setFilter] = useState<"all" | GalleryImage["category"]>("all");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const images = useMemo(() => {
    const filtered =
      filter === "all"
        ? galleryImages
        : galleryImages.filter((image) => image.category === filter);
    return full ? filtered : filtered.slice(0, 8);
  }, [filter, full]);

  const placeholders = useMemo(
    () =>
      filter === "all"
        ? placeholderSlots
        : placeholderSlots.filter((slot) => slot.category === filter),
    [filter],
  );

  const hasRealImages = images.length > 0;

  return (
    <section id="gallery" className="scroll-mt-20 bg-ink py-28 md:py-40">
      <div className="container-edit">
        {hideHeading ? null : (
          <SectionHeading
            eyebrow="Gallery"
            title="MOMENTI, NON SOLO FOTO"
            description="Un assaggio delle atmosfere costruite evento dopo evento."
          />
        )}

        <div
          role="tablist"
          aria-label="Filtra la gallery"
          className={cn("flex flex-wrap gap-3", hideHeading ? undefined : "mt-10")}
        >
          {galleryFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-5 py-2 text-sm transition-colors",
                filter === f.value
                  ? "border-champagne bg-champagne/10 text-champagne"
                  : "border-line text-ivory-dim hover:border-champagne/50 hover:text-champagne",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {hasRealImages ? (
          <div className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
            {images.map((image, index) => (
              <button
                key={image.src}
                type="button"
                onClick={() => setActiveIndex(index)}
                className="group relative mb-4 block w-full overflow-hidden rounded-xl border border-line"
                style={{ breakInside: "avoid" }}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  preload={image.priority}
                  className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
            {placeholders.map((slot, index) => (
              <div
                key={`${slot.category}-${index}`}
                className={cn(
                  "group relative mb-4 block w-full overflow-hidden rounded-xl border border-line",
                  slot.aspect,
                )}
                style={{ breakInside: "avoid" }}
              >
                <PlaceholderMedia
                  number={`0${index + 1}`}
                  label={slot.category}
                  tone={index % 2 === 0 ? "dark" : "darker"}
                />
              </div>
            ))}
          </div>
        )}

        {full ? null : (
          <div className="mt-8">
            <Link href="/gallery" className="eyebrow hover:text-champagne-bright">
              Vedi tutta la gallery →
            </Link>
          </div>
        )}
      </div>

      {activeIndex !== null ? (
        <Lightbox
          images={images}
          activeIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
          onNavigate={setActiveIndex}
        />
      ) : null}
    </section>
  );
}
