"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Zap, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { QuickQuoteForm } from "@/components/sections/QuickQuoteForm";

// Punto di forza sempre visibile (non legato all'uscita dal sito): un
// pulsante fisso che invita a chiedere un preventivo veloce, in ogni
// momento della visita. Nascosto solo su /contatti, dove ci si è già
// arrivati per lo stesso motivo.
export function QuickQuoteWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname?.startsWith("/contatti")) return null;

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-label="Richiedi un preventivo veloce"
            className="fixed bottom-40 left-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-champagne/30 bg-charcoal-soft/95 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:bottom-24 sm:left-8"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Chiudi"
              className="absolute right-3 top-3 rounded-full p-1 text-ivory-dim hover:text-champagne"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <p className="font-display text-xl text-ivory">Preventivo veloce</p>
            <p className="mt-2 text-sm text-ivory-dim">
              Poche informazioni, senza impegno: ti mandiamo un preventivo entro poche ore.
            </p>
            <div className="mt-5">
              <QuickQuoteForm />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        animate={
          open
            ? undefined
            : {
                boxShadow: [
                  "0 0 0 0 rgba(201,168,118,0.55)",
                  "0 0 0 12px rgba(201,168,118,0)",
                ],
              }
        }
        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.4, ease: "easeOut" }}
        className="fixed bottom-24 left-4 z-40 flex items-center gap-2.5 rounded-full bg-champagne py-3.5 pl-3.5 pr-5 text-ink ring-1 ring-ink/10 transition-colors hover:bg-champagne-bright sm:bottom-8 sm:left-8"
      >
        <Zap className="h-5 w-5 shrink-0" aria-hidden />
        <span className="flex flex-col items-start leading-tight">
          <span className="text-sm font-semibold">Preventivo veloce</span>
          <span className="text-[11px] font-normal text-ink/70">Senza impegno</span>
        </span>
      </motion.button>
    </>
  );
}
