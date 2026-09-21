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
              3 informazioni veloci: ti mandiamo un preventivo entro poche ore.
            </p>
            <div className="mt-5">
              <QuickQuoteForm />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="fixed bottom-24 left-4 z-40 flex items-center gap-2 rounded-full bg-champagne py-3 pl-3 pr-4 text-sm font-medium text-ink shadow-md shadow-black/20 ring-1 ring-ink/10 transition-colors hover:bg-champagne-bright sm:bottom-8 sm:left-8"
      >
        <Zap className="h-4 w-4" aria-hidden />
        Preventivo veloce
      </button>
    </>
  );
}
