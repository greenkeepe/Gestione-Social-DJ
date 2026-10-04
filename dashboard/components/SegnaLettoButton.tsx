"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Undo2 } from "lucide-react";
import { Button } from "./ui/Button";

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
    <Button variant="secondary" size="sm" onClick={toggle} loading={caricamento}>
      {letto ? <Undo2 size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
      {letto ? "Segna da rivedere" : "Segna come letto"}
    </Button>
  );
}
