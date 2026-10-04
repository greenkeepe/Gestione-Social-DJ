"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Segna/togli il segna-come-letto su un questionario sposi: solo per tenere
// traccia di quali hai già controllato, nessuna modifica ai dati compilati.
export function SegnaLettoButton({ id, letto }: { id: string; letto: boolean }) {
  const [caricamento, setCaricamento] = useState(false);
  const router = useRouter();

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    setCaricamento(true);
    try {
      const res = await fetch(`/api/questionari/${id}`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Operazione fallita.");
      router.refresh();
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <button type="button" onClick={toggle} disabled={caricamento} className="upload-btn">
      {caricamento ? "..." : letto ? "Segna da rivedere" : "Segna come letto"}
    </button>
  );
}
