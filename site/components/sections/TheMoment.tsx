"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";

// Momento cinematografico full-bleed: fasci di luce da palco al posto del
// solito blur radiale — un linguaggio grafico specifico da dancefloor,
// non un gradiente generico riusato ovunque nel sito.
const beams = [
  { rotate: -18, left: "8%", width: "26vw", opacity: 0.22 },
  { rotate: 14, left: "48%", width: "30vw", opacity: 0.16 },
  { rotate: -6, left: "78%", width: "20vw", opacity: 0.14 },
];

export function TheMoment() {
  const t = useTranslations("TheMoment");
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.08, 1, 1.08]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-black"
    >
      <motion.div
        className="absolute inset-0"
        style={shouldReduceMotion ? undefined : { scale }}
      >
        {beams.map((beam, index) => (
          <div
            key={index}
            className="absolute -top-1/4 h-[150%]"
            style={{
              left: beam.left,
              width: beam.width,
              opacity: beam.opacity,
              transform: `rotate(${beam.rotate}deg)`,
              background:
                "linear-gradient(180deg, rgba(226,200,150,0.9) 0%, rgba(201,168,118,0.25) 45%, transparent 80%)",
              filter: "blur(18px)",
            }}
            aria-hidden
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/70 to-black" aria-hidden />
      </motion.div>
      <div className="grain-overlay" aria-hidden />

      <div className="relative text-center">
        <p className="eyebrow mb-4 text-ivory-dim">{t("eyebrow")}</p>
        <p className="font-display text-4xl uppercase tracking-[0.08em] text-ivory sm:text-5xl">
          {t("that")}
        </p>
        <p className="font-display text-[18vw] leading-[0.85] text-champagne sm:text-[13vw] md:text-[11vw]">
          {t("moment")}
        </p>
      </div>
    </section>
  );
}
