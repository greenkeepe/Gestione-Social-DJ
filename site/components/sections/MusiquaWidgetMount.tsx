"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { siteConfig } from "@/data/site";

/**
 * Il widget Musiqua non è un embed inline: si comporta come un badge
 * flottante, si aggiunge da solo come figlio diretto di <body> e si
 * autoposiziona con position:fixed in un angolo dello schermo, restando
 * "incollato" alla viewport invece di stare nel flusso della pagina.
 * Spostarlo nel DOM non basta (la sua stessa posizione fixed lo rimette
 * comunque in overlay): dobbiamo anche neutralizzare via stile inline la
 * sua posizione fixed/sticky, e farlo di nuovo ogni volta che il widget
 * prova a riapplicarla (osservando i cambi di style/class sull'elemento).
 */
function neutralizeFixedPositioning(el: HTMLElement) {
  const computed = window.getComputedStyle(el);
  if (computed.position === "fixed" || computed.position === "sticky") {
    el.style.setProperty("position", "static", "important");
    el.style.setProperty("top", "auto", "important");
    el.style.setProperty("left", "auto", "important");
    el.style.setProperty("right", "auto", "important");
    el.style.setProperty("bottom", "auto", "important");
    el.style.setProperty("z-index", "auto", "important");
    el.style.setProperty("transform", "none", "important");
    el.style.setProperty("max-width", "none", "important");
    el.style.setProperty("max-height", "none", "important");
    el.style.setProperty("width", "100%", "important");
  }
}

// La posizione fixed potrebbe essere su un wrapper interno, non solo sulla
// radice: controlliamo l'intero sottoalbero (è piccolo, un widget recensioni).
function neutralizeSubtree(root: HTMLElement) {
  neutralizeFixedPositioning(root);
  root.querySelectorAll<HTMLElement>("*").forEach(neutralizeFixedPositioning);
}

export function MusiquaWidgetMount() {
  const mountRef = useRef<HTMLDivElement>(null);
  const claimedRootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let styleObserver: MutationObserver | null = null;

    const watchAndFix = (root: HTMLElement) => {
      neutralizeSubtree(root);
      // Alcuni widget flottanti riapplicano la propria posizione fixed
      // dopo il caricamento (onload, resize, scroll): continuiamo a
      // correggerla se succede, sull'intero sottoalbero.
      styleObserver = new MutationObserver(() => neutralizeSubtree(root));
      styleObserver.observe(root, {
        attributes: true,
        attributeFilter: ["style", "class"],
        subtree: true,
      });
    };

    const tryClaim = () => {
      if (claimedRootRef.current) return;

      const item = document.querySelector<HTMLElement>(
        ".musiqua-rw-item, .feedbacks__item",
      );
      if (!item) return;

      let root: HTMLElement | null = item;
      while (
        root &&
        root.parentElement &&
        root.parentElement !== document.body
      ) {
        root = root.parentElement;
      }

      if (root && root.parentElement === document.body && !mount.contains(root)) {
        mount.appendChild(root);
        claimedRootRef.current = root;
        watchAndFix(root);
        bodyObserver.disconnect();
      }
    };

    tryClaim();

    const bodyObserver = new MutationObserver(tryClaim);
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      bodyObserver.disconnect();
      styleObserver?.disconnect();
    };
  }, []);

  return (
    <>
      <div ref={mountRef} id="musiqua-reviews-widget" />
      <Script src={siteConfig.musiquaWidgetSrc} strategy="lazyOnload" />
    </>
  );
}
