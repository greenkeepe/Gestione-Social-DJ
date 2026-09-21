"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { weddingMoments } from "@/data/events";

// Il momento "Party" resta il picco visivo della timeline (bordo/ombra
// champagne più marcati); ogni tappa senza una foto reale ancora disponibile
// torna automaticamente al trattamento tipografico invece di un placeholder.
const intenseSteps = new Set([4]);

export function Wedding({ hideHeading = false }: { hideHeading?: boolean }) {
  const t = useTranslations("Wedding");
  const tMoments = useTranslations("WeddingMoments");
  const timelineRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start 0.7", "end 0.6"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="matrimoni" className="scroll-mt-20 bg-charcoal py-28 md:py-40">
      <div className="container-edit">
        {hideHeading ? null : (
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={
              <>
                {t("titleLine1")}
                <br />
                <span className="text-champagne">{t("titleLine2")}</span>
              </>
            }
          />
        )}

        <div
          ref={timelineRef}
          className={cn(
            "relative flex flex-col gap-16 md:gap-28",
            hideHeading ? undefined : "mt-20 md:mt-28",
          )}
        >
          <div
            className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-line md:block"
            aria-hidden
          />
          <motion.div
            className="absolute left-1/2 top-0 hidden w-px -translate-x-1/2 bg-champagne md:block"
            style={{
              height: "100%",
              scaleY: shouldReduceMotion ? 1 : lineScale,
              transformOrigin: "top",
            }}
            aria-hidden
          />

          {weddingMoments.map((moment, index) => {
            const reversed = index % 2 === 1;
            const isIntense = intenseSteps.has(index);
            const momentTitle = tMoments(`${moment.key}.title`);
            const momentDescription = tMoments(`${moment.key}.description`);

            return (
              <div
                key={moment.key}
                className="relative grid items-center gap-6 md:grid-cols-2 md:gap-16"
              >
                <Reveal
                  className={reversed ? "md:order-2" : undefined}
                  y={28}
                >
                  {moment.imageSrc ? (
                    <div
                      className={cn(
                        "relative aspect-[4/3] overflow-hidden rounded-2xl border",
                        isIntense
                          ? "border-champagne/40 shadow-[0_0_60px_-10px_rgba(201,168,118,0.35)]"
                          : "border-line",
                      )}
                    >
                      <Image
                        src={moment.imageSrc}
                        alt={moment.imageAlt ?? momentTitle}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "flex aspect-[4/3] items-center overflow-hidden px-2",
                        reversed ? "md:justify-end" : "md:justify-start",
                      )}
                    >
                      <span
                        className="font-display select-none text-6xl uppercase leading-[0.95] text-transparent sm:text-7xl"
                        style={{ WebkitTextStroke: "1.5px rgba(201,168,118,0.35)" }}
                        aria-hidden
                      >
                        {momentTitle}
                      </span>
                    </div>
                  )}
                </Reveal>
                <Reveal
                  delay={0.1}
                  className={reversed ? "md:text-right" : undefined}
                >
                  <span className="font-display text-5xl text-champagne md:text-6xl">
                    0{index + 1}
                  </span>
                  <h3 className="mt-2 font-display text-2xl text-ivory md:text-3xl">
                    {momentTitle}
                  </h3>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-ivory-dim md:ml-auto md:mr-0">
                    {momentDescription}
                  </p>
                </Reveal>
              </div>
            );
          })}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-20 flex flex-col items-center gap-4 sm:flex-row sm:justify-center md:mt-28">
            <Button href="/contatti" size="lg">
              {t("ctaAvailability")}
            </Button>
            <Button href="#gallery" variant="secondary" size="lg">
              {t("ctaGallery")}
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
