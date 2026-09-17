"use client";

import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { heroMedia } from "@/data/media";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
};

export function Hero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink">
      {heroMedia.imageSrc ? (
        <>
          <Image
            src={heroMedia.imageSrc}
            alt={heroMedia.imageAlt}
            fill
            priority
            preload
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/50 to-ink" aria-hidden />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 22% 28%, rgba(201,168,118,0.16), transparent 45%), radial-gradient(circle at 78% 70%, rgba(201,168,118,0.10), transparent 50%), linear-gradient(180deg, #0b0a08 0%, #16140f 60%, #0b0a08 100%)",
          }}
          aria-hidden
        />
      )}
      <motion.div
        className="absolute -top-1/4 left-[12%] h-[150%] w-[22vw]"
        style={{
          transform: "rotate(-16deg)",
          background:
            "linear-gradient(180deg, rgba(226,200,150,0.5) 0%, rgba(201,168,118,0.12) 45%, transparent 80%)",
          filter: "blur(30px)",
        }}
        animate={shouldReduceMotion ? undefined : { opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.div
        className="absolute -top-1/4 right-[16%] h-[150%] w-[16vw]"
        style={{
          transform: "rotate(12deg)",
          background:
            "linear-gradient(180deg, rgba(226,200,150,0.35) 0%, rgba(201,168,118,0.1) 45%, transparent 80%)",
          filter: "blur(30px)",
        }}
        animate={shouldReduceMotion ? undefined : { opacity: [0.7, 0.4, 0.7] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <div className="grain-overlay" aria-hidden />

      <div
        className="absolute bottom-16 left-8 hidden -rotate-90 text-[0.65rem] uppercase tracking-[0.4em] text-ivory-dim/50 lg:block"
        style={{ transformOrigin: "left bottom" }}
        aria-hidden
      >
        Forte DJ — Dj &amp; Events
      </div>

      <motion.div
        variants={shouldReduceMotion ? undefined : container}
        initial={shouldReduceMotion ? undefined : "hidden"}
        animate={shouldReduceMotion ? undefined : "show"}
        className="container-edit relative z-10 flex flex-col items-center pt-24 text-center"
      >
        <motion.p variants={item} className="eyebrow mb-6">
          DJ • WEDDING • EVENTS
        </motion.p>
        <motion.h1
          variants={item}
          className="font-display text-balance text-5xl leading-[1.05] text-ivory sm:text-6xl md:text-7xl lg:text-8xl"
        >
          LA MUSICA
          <br />
          CHE TRASFORMA
          <br />
          UN MOMENTO
          <br />
          <span className="text-champagne">IN UN RICORDO.</span>
        </motion.h1>
        <motion.p
          variants={item}
          className="mt-8 max-w-xl text-balance text-lg text-ivory-dim md:text-xl"
        >
          DJ &amp; Entertainment per matrimoni, eventi e party costruiti
          intorno alle persone, alla musica e all&rsquo;energia della serata.
        </motion.p>
        <motion.div
          variants={item}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Button href="/contatti" size="lg">
            Verifica la disponibilità
          </Button>
          <Button href="#showreel" variant="secondary" size="lg">
            Guarda l&rsquo;esperienza
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-ivory-dim"
        animate={shouldReduceMotion ? undefined : { y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="text-[0.65rem] uppercase tracking-[0.3em]">
          Scroll to explore
        </span>
        <span aria-hidden>↓</span>
      </motion.div>
    </section>
  );
}
