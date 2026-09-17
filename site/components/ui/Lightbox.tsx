"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import type { GalleryImage } from "@/data/gallery";

export function Lightbox({
  images,
  activeIndex,
  onClose,
  onNavigate,
}: {
  images: GalleryImage[];
  activeIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);

  const goNext = useCallback(
    () => onNavigate((activeIndex + 1) % images.length),
    [activeIndex, images.length, onNavigate],
  );
  const goPrev = useCallback(
    () => onNavigate((activeIndex - 1 + images.length) % images.length),
    [activeIndex, images.length, onNavigate],
  );

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [goNext, goPrev, onClose]);

  if (typeof document === "undefined") return null;
  const image = images[activeIndex];
  if (!image) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={image.alt}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 backdrop-blur-sm"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (delta > 50) goPrev();
        if (delta < -50) goNext();
        touchStartX.current = null;
      }}
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label="Chiudi galleria"
        className="absolute right-4 top-4 rounded-full border border-ivory/20 p-2 text-ivory hover:border-champagne hover:text-champagne sm:right-8 sm:top-8"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      <button
        type="button"
        onClick={goPrev}
        aria-label="Immagine precedente"
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-ivory/20 p-2 text-ivory hover:border-champagne hover:text-champagne sm:left-6"
      >
        <ChevronLeft className="h-6 w-6" aria-hidden />
      </button>

      <div className="relative mx-12 aspect-[4/5] w-full max-w-2xl sm:mx-24">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(max-width: 768px) 90vw, 640px"
          className="object-contain"
        />
      </div>

      <button
        type="button"
        onClick={goNext}
        aria-label="Immagine successiva"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-ivory/20 p-2 text-ivory hover:border-champagne hover:text-champagne sm:right-6"
      >
        <ChevronRight className="h-6 w-6" aria-hidden />
      </button>
    </div>,
    document.body,
  );
}
