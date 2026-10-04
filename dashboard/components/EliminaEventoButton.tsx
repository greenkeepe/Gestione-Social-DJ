"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "./ui/Button";
import { useConfirm } from "./ui/ConfirmDialog";

export function EliminaEventoButton({ id, cliente }: { id: string; cliente: string }) {
  const [caricamento, setCaricamento] = useState(false);
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  async function elimina() {
    const ok = await confirm({
      title: "Elimina evento",
      message: `Eliminare l'evento "${cliente}"? Se era già stato compilato, si perdono anche le risposte del Wedding Music Planner.`
    });
    if (!ok) return;
    setCaricamento(true);
    try {
      const res = await fetch(`/api/eventi/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Eliminazione fallita.");
      router.push("/eventi");
      router.refresh();
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={elimina} loading={caricamento}>
        <Trash2 size={14} aria-hidden="true" /> Elimina evento
      </Button>
      {dialog}
    </>
  );
}
