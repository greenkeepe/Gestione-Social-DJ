"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { siteConfig } from "@/data/site";

/**
 * Il widget Musiqua non è un embed inline: si comporta come un badge
 * flottante, si aggiunge da solo come figlio diretto di <body> e si
 * autoposiziona con position:fixed in un angolo dello schermo. Inoltre ha
 * un proprio foglio di stile che impila le recensioni in verticale e che,
 * in certi casi, può avere una specificità/​!important pari o superiore al
 * nostro CSS esterno. Per essere sicuri di vincere sempre la cascata,
 * scriviamo lo stile chiave (posizione, layout orizzontale) direttamente
 * come stile inline con !important via JS: uno stile inline !important ha
 * la priorità più alta possibile, superiore a qualunque regola in un
 * foglio di stile esterno, indipendentemente dalla sua specificità.
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

function forceHorizontalScroll(root: HTMLElement) {
  const list =
    root.querySelector<HTMLElement>(".musiqua-rw-list") ??
    root.querySelector<HTMLElement>("ul");

  if (list) {
    list.style.setProperty("display", "flex", "important");
    list.style.setProperty("flex-wrap", "nowrap", "important");
    list.style.setProperty("align-items", "stretch", "important");
    list.style.setProperty("overflow-x", "auto", "important");
    list.style.setProperty("overflow-y", "hidden", "important");
    list.style.setProperty("gap", "1.25rem", "important");
    list.style.setProperty("padding-bottom", "1rem", "important");
    list.style.setProperty("margin", "0", "important");
    list.style.setProperty("list-style", "none", "important");
    list.style.setProperty("scroll-snap-type", "x proximity", "important");
    list.style.setProperty("-webkit-overflow-scrolling", "touch", "important");
  }

  const items = root.querySelectorAll<HTMLElement>(
    ".musiqua-rw-item, .feedbacks__item",
  );
  items.forEach((item) => {
    item.style.setProperty("flex", "0 0 auto", "important");
    item.style.setProperty("width", "min(22rem, 82vw)", "important");
    item.style.setProperty("margin", "0", "important");
    item.style.setProperty("scroll-snap-align", "start", "important");
  });
}

// La posizione fixed e il layout potrebbero essere su un wrapper interno,
// non solo sulla radice: controlliamo l'intero sottoalbero (è piccolo, un
// widget recensioni).
function applyFixes(root: HTMLElement) {
  neutralizeFixedPositioning(root);
  root.querySelectorAll<HTMLElement>("*").forEach(neutralizeFixedPositioning);
  forceHorizontalScroll(root);
}

export function MusiquaWidgetMount() {
  const mountRef = useRef<HTMLDivElement>(null);
  const claimedRootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let styleObserver: MutationObserver | null = null;

    const watchAndFix = (root: HTMLElement) => {
      applyFixes(root);
      // Il widget potrebbe riapplicare la propria posizione/layout dopo il
      // caricamento (onload, resize, scroll, o un suo re-render interno):
      // continuiamo a correggerlo se succede.
      styleObserver = new MutationObserver(() => applyFixes(root));
      styleObserver.observe(root, {
        attributes: true,
        attributeFilter: ["style", "class"],
        subtree: true,
        childList: true,
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
