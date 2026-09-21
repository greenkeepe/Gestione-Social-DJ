"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReelVideo } from "@/data/media";

export function VideoLightbox({
  videos,
  activeIndex,
  onClose,
  onNavigate,
}: {
  videos: ReelVideo[];
  activeIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const t = useTranslations("Lightbox");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const goNext = useCallback(
    () => onNavigate((activeIndex + 1) % videos.length),
    [activeIndex, videos.length, onNavigate],
  );
  const goPrev = useCallback(
    () => onNavigate((activeIndex - 1 + videos.length) % videos.length),
    [activeIndex, videos.length, onNavigate],
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
  const video = videos[activeIndex];
  if (!video) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 backdrop-blur-sm"
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label={t("closeVideo")}
        className="absolute right-4 top-4 rounded-full border border-ivory/20 p-2 text-ivory hover:border-champagne hover:text-champagne sm:right-8 sm:top-8"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      {videos.length > 1 ? (
        <button
          type="button"
          onClick={goPrev}
          aria-label={t("previousVideo")}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-ivory/20 p-2 text-ivory hover:border-champagne hover:text-champagne sm:left-6"
        >
          <ChevronLeft className="h-6 w-6" aria-hidden />
        </button>
      ) : null}

      <div className="relative mx-12 aspect-video w-full max-w-3xl sm:mx-24">
        <video
          key={video.videoSrc}
          className="h-full w-full rounded-xl object-contain"
          poster={video.posterSrc}
          controls
          autoPlay
          playsInline
        >
          <source src={video.videoSrc} type="video/mp4" />
        </video>
      </div>

      {videos.length > 1 ? (
        <button
          type="button"
          onClick={goNext}
          aria-label={t("nextVideo")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-ivory/20 p-2 text-ivory hover:border-champagne hover:text-champagne sm:right-6"
        >
          <ChevronRight className="h-6 w-6" aria-hidden />
        </button>
      ) : null}
    </div>,
    document.body,
  );
}
