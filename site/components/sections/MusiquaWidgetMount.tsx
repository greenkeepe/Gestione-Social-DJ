"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { siteConfig } from "@/data/site";

/**
 * Il widget Musiqua non renderizza dentro il contenitore che gli offriamo:
 * si aggiunge da solo come figlio diretto di <body>, in fondo alla pagina
 * (dopo il footer), ignorando dove abbiamo messo lo <script>. Per riportarlo
 * nella sezione Recensioni — dove serve lo styling per lo scroll
 * orizzontale — troviamo la prima recensione reale (".feedbacks__item") non
 * appena compare ovunque nel documento, risaliamo fino al suo antenato
 * figlio diretto di <body> e spostiamo l'intero blocco nel nostro
 * contenitore.
 */
export function MusiquaWidgetMount() {
  const mountRef = useRef<HTMLDivElement>(null);
  const claimedRef = useRef(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const tryClaim = () => {
      if (claimedRef.current) return;

      const item = document.querySelector<HTMLElement>(".feedbacks__item");
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
        claimedRef.current = true;
        observer.disconnect();
      }
    };

    tryClaim();

    const observer = new MutationObserver(tryClaim);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={mountRef} id="musiqua-reviews-widget" />
      <Script src={siteConfig.musiquaWidgetSrc} strategy="lazyOnload" />
    </>
  );
}
