"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";
import { Zap } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/data/site";

export function FinalCTA() {
  const t = useTranslations("FinalCTA");
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);
  const glow = useTransform(scrollYProgress, [0, 1], [0.08, 0.22]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink"
    >
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: shouldReduceMotion ? 0.16 : glow,
          backgroundImage:
            "radial-gradient(circle at 50% 30%, rgba(201,168,118,1), transparent 60%)",
        }}
        aria-hidden
      />
      <div className="grain-overlay" aria-hidden />
      <motion.div
        style={shouldReduceMotion ? undefined : { scale }}
        className="container-edit relative flex flex-col items-center text-center"
      >
        <Reveal>
          <h2 className="font-display text-balance text-5xl leading-[1.05] text-ivory sm:text-6xl md:text-7xl lg:text-8xl">
            {t("titleLine1")}
            <br />
            {t("titleLine2")}
            <br />
            <span className="text-champagne">{t("titleLine3")}</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-8 max-w-xl text-balance text-lg text-ivory-dim">
            {t("description")}
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
            <Button href="/#preventivo" size="lg">
              <Zap className="h-4 w-4" aria-hidden />
              {t("ctaAvailability")}
            </Button>
            {siteConfig.whatsappNumber ? (
              <Button
                href={siteConfig.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                size="lg"
              >
                {t("ctaWhatsapp")}
              </Button>
            ) : null}
          </div>
        </Reveal>
      </motion.div>
    </section>
  );
}
