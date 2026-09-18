"use client";

import { useRef } from "react";
import { Play } from "lucide-react";
import type { ReelVideo } from "@/data/media";

export function VideoCard({
  video,
  onOpen,
}: {
  video: ReelVideo;
  onOpen: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleEnter = () => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.play().catch(() => {});
  };

  const handleLeave = () => {
    const el = videoRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  };

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      aria-label={`Riproduci: ${video.title}`}
      className="group relative aspect-video w-[min(20rem,72vw)] shrink-0 overflow-hidden rounded-2xl border border-line bg-ink transition-colors duration-300 hover:border-champagne/50"
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        poster={video.posterSrc}
        muted
        loop
        playsInline
        preload="none"
      >
        <source src={video.videoSrc} type="video/mp4" />
      </video>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent opacity-100 transition-opacity duration-300 group-hover:opacity-60" />
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-100 transition-opacity duration-300 group-hover:opacity-0"
        aria-hidden
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-champagne/40 bg-ink/60 backdrop-blur-sm">
          <Play className="ml-0.5 h-5 w-5 text-champagne" aria-hidden />
        </div>
      </div>
      <span className="pointer-events-none absolute bottom-3 left-4 text-sm font-medium text-ivory">
        {video.title}
      </span>
    </button>
  );
}
