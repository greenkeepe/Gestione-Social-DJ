"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

const STORAGE_KEY = "forte-dj-exit-intent-shown";
const MIN_TIME_ON_PAGE_MS = 8000;

export function ExitIntent() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Discreto per natura: niente su mobile/touch, niente sulla pagina
    // contatti (ci si è già arrivati), niente se già mostrato in sessione.
    if (pathname?.startsWith("/contatti")) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const loadedAt = Date.now();

    const onMouseLeave = (event: MouseEvent) => {
      if (event.clientY > 0) return;
      if (Date.now() - loadedAt < MIN_TIME_ON_PAGE_MS) return;
      if (sessionStorage.getItem(STORAGE_KEY)) return;

      sessionStorage.setItem(STORAGE_KEY, "1");
      setVisible(true);
      document.removeEventListener("mouseleave", onMouseLeave);
    };

    document.addEventListener("mouseleave", onMouseLeave);
    return () => document.removeEventListener("mouseleave", onMouseLeave);
  }, [pathname]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-label="Verifica la disponibilità"
          className="fixed bottom-8 left-8 z-50 hidden w-[min(22rem,calc(100vw-4rem))] rounded-2xl border border-champagne/30 bg-charcoal-soft/95 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm lg:block"
        >
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Chiudi"
            className="absolute right-3 top-3 rounded-full p-1 text-ivory-dim hover:text-champagne"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
          <p className="font-display text-xl text-ivory">
            Stai organizzando un evento?
          </p>
          <p className="mt-2 text-sm text-ivory-dim">
            Raccontaci data e location: scopri subito se siamo liberi.
          </p>
          <div className="mt-5">
            <Button href="/contatti" onClick={() => setVisible(false)}>
              Verifica la disponibilità
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
