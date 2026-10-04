"use client";

import { useState } from "react";

// Copia il link del Wedding Music Planner negli appunti, pronto da
// incollare in una chat WhatsApp — niente da riscrivere a mano.
export function CopiaLinkButton({ link }: { link: string }) {
  const [copiato, setCopiato] = useState(false);

  async function copia() {
    await navigator.clipboard.writeText(link);
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2000);
  }

  return (
    <button type="button" onClick={copia} className="upload-btn">
      {copiato ? "✅ Copiato!" : "📋 Copia link"}
    </button>
  );
}
