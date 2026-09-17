"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

export function Intro() {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.95", "start 0.35"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0.15, 1]);

  return (
    <section
      id="intro"
      ref={ref}
      className="flex min-h-[85svh] items-center justify-center bg-ink py-28"
    >
      <div className="container-edit text-center">
        <p className="eyebrow mb-8">The Forte DJ Experience</p>
        <motion.h2
          style={
            shouldReduceMotion
              ? undefined
              : { scale, opacity }
          }
          className="font-display text-balance text-3xl leading-[1.05] text-ivory sm:text-5xl md:text-6xl lg:text-7xl"
        >
          NON È SOLO MUSICA.
          <br />
          <span className="text-champagne">
            È QUEL MOMENTO IN CUI TUTTI INIZIANO A BALLARE.
          </span>
        </motion.h2>
      </div>
    </section>
  );
}
