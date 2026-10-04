"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "./ui/Button";

export function CopiaLinkButton({ link }: { link: string }) {
  const [copiato, setCopiato] = useState(false);

  async function copia() {
    await navigator.clipboard.writeText(link);
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2000);
  }

  return (
    <Button variant="secondary" size="sm" onClick={copia}>
      {copiato ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {copiato ? "Copiato!" : "Copia link"}
    </Button>
  );
}
