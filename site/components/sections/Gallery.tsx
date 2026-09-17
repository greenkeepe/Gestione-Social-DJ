"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Lightbox } from "@/components/ui/Lightbox";
import { cn } from "@/lib/utils";
import { galleryImages, galleryFilters, type GalleryImage } from "@/data/gallery";

export function Gallery({ full = false }: { full?: boolean }) {
  const [filter, setFilter] = useState<"all" | GalleryImage["category"]>("all");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const images = useMemo(() => {
    const filtered =
      filter === "all"
        ? galleryImages
        : galleryImages.filter((image) => image.category === filter);
    return full ? filtered : filtered.slice(0, 8);
  }, [filter, full]);

  return (
    <section className="bg-ink py-28 md:py-40">
      <div className="container-edit">
        <SectionHeading
          eyebrow="Gallery"
          title="MOMENTI, NON SOLO FOTO"
          description="Un assaggio delle atmosfere costruite evento dopo evento."
        />

        <div
          role="tablist"
          aria-label="Filtra la gallery"
          className="mt-10 flex flex-wrap gap-3"
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

        {images.length > 0 ? (
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
                  priority={image.priority}
                  className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line bg-charcoal-soft/40 py-20 text-center">
            <Camera className="h-8 w-8 text-champagne/60" aria-hidden />
            <p className="eyebrow">Gallery in aggiornamento</p>
            <p className="max-w-sm text-sm text-ivory-dim">
              Le foto degli eventi più recenti arriveranno presto. Nel
              frattempo scopri le recensioni di chi c&rsquo;era.
            </p>
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
