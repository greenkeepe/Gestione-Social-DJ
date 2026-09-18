"use client";

import { useRef, useState } from "react";
import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { VideoCard } from "@/components/ui/VideoCard";
import { VideoLightbox } from "@/components/ui/VideoLightbox";
import { InstagramIcon, FacebookIcon, YoutubeIcon, TiktokIcon } from "@/components/ui/SocialIcons";
import { showreel, reelVideos } from "@/data/media";
import { siteConfig } from "@/data/site";

const socialLinks = [
  { href: siteConfig.instagramUrl, label: "Instagram", Icon: InstagramIcon },
  { href: siteConfig.facebookUrl, label: "Facebook", Icon: FacebookIcon },
  { href: siteConfig.tiktokUrl, label: "TikTok", Icon: TiktokIcon },
  { href: siteConfig.youtubeUrl, label: "YouTube", Icon: YoutubeIcon },
].filter((link) => Boolean(link.href));

export function Showreel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const requestFullscreen = () => {
    videoRef.current?.requestFullscreen?.();
  };

  return (
    <section id="showreel" className="bg-charcoal py-28 md:py-40">
      <div className="container-edit">
        <SectionHeading
          eyebrow="Showreel"
          title="FEEL THE ENERGY"
          description="Guarda cosa succede quando la musica prende il controllo della serata."
          align="center"
        />

        <div className="relative mx-auto mt-14 aspect-video w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-ink">
          {showreel.videoSrc ? (
            <>
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                poster={showreel.posterSrc || undefined}
                muted={muted}
                loop
                playsInline
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              >
                <source src={showreel.videoSrc} />
              </video>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-ink/90 to-transparent p-5">
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={playing ? "Metti in pausa" : "Riproduci"}
                  className="rounded-full border border-ivory/30 p-3 text-ivory hover:border-champagne hover:text-champagne"
                >
                  {playing ? (
                    <Pause className="h-5 w-5" aria-hidden />
                  ) : (
                    <Play className="h-5 w-5" aria-hidden />
                  )}
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={muted ? "Attiva audio" : "Disattiva audio"}
                    className="rounded-full border border-ivory/30 p-3 text-ivory hover:border-champagne hover:text-champagne"
                  >
                    {muted ? (
                      <VolumeX className="h-5 w-5" aria-hidden />
                    ) : (
                      <Volume2 className="h-5 w-5" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={requestFullscreen}
                    aria-label="Schermo intero"
                    className="rounded-full border border-ivory/30 p-3 text-ivory hover:border-champagne hover:text-champagne"
                  >
                    <Maximize className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <PlaceholderMedia tone="darker" showIcon={false} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full border border-champagne/40 bg-ink/60 backdrop-blur-sm"
                  aria-hidden
                >
                  <Play className="ml-1 h-7 w-7 text-champagne" aria-hidden />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {reelVideos.length > 0 ? (
        <div className="mt-10 flex justify-center gap-5 overflow-x-auto px-5 pb-4 sm:px-10 md:px-[max(2.5rem,calc((100vw-84rem)/2+2.5rem))]">
          {reelVideos.map((video, index) => (
            <VideoCard
              key={video.videoSrc}
              video={video}
              onOpen={() => setActiveReelIndex(index)}
            />
          ))}
        </div>
      ) : null}

      {activeReelIndex !== null ? (
        <VideoLightbox
          videos={reelVideos}
          activeIndex={activeReelIndex}
          onClose={() => setActiveReelIndex(null)}
          onNavigate={setActiveReelIndex}
        />
      ) : null}

      <div className="container-edit">
        <div className="mt-12 flex flex-col items-center gap-6">
          <Button href="/contatti" size="lg">
            Verifica la disponibilità
          </Button>
          {socialLinks.length > 0 ? (
            <div className="flex items-center gap-4">
              {socialLinks.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="rounded-full border border-line p-3 text-ivory-dim transition-colors hover:border-champagne hover:text-champagne"
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
