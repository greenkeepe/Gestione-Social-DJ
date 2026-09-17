"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 22% 28%, rgba(201,168,118,0.16), transparent 45%), radial-gradient(circle at 78% 70%, rgba(201,168,118,0.10), transparent 50%), linear-gradient(180deg, #0b0a08 0%, #16140f 60%, #0b0a08 100%)",
        }}
        aria-hidden
      />
      <motion.div
        className="absolute -left-1/4 top-1/3 h-[40rem] w-[40rem] rounded-full bg-champagne/10 blur-[140px]"
        animate={shouldReduceMotion ? undefined : { scale: [1, 1.15, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <div className="grain-overlay" aria-hidden />

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
          LA TUA SERATA.
          <br />
          LA TUA MUSICA.
          <br />
          <span className="text-champagne">IL TUO MOMENTO.</span>
        </motion.h1>
        <motion.p
          variants={item}
          className="mt-8 max-w-xl text-balance text-lg text-ivory-dim md:text-xl"
        >
          DJ &amp; Entertainment per matrimoni, eventi e party che meritano di
          essere ricordati.
        </motion.p>
        <motion.div
          variants={item}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Button href="/contatti" size="lg">
            Verifica la disponibilità
          </Button>
          <Button href="#intro" variant="secondary" size="lg">
            Scopri Forte DJ
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-ivory-dim"
        animate={shouldReduceMotion ? undefined : { y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      >
        <ChevronDown className="h-6 w-6" />
      </motion.div>
    </section>
  );
}
