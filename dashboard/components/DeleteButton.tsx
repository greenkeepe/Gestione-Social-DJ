"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "./ui/Button";
import { useConfirm } from "./ui/ConfirmDialog";

// Bottone generico per eliminare una riga (media, contenuto in coda, job
// Reel AI) via l'API DELETE corrispondente. Chiede sempre conferma prima:
// l'eliminazione dai file dati (e dai file su R2 dove previsto) non è
// annullabile.
export function DeleteButton({ url, conferma = "Eliminare? Non si può annullare." }: { url: string; conferma?: string }) {
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  async function elimina() {
    const ok = await confirm({ title: "Conferma eliminazione", message: conferma, confirmLabel: "Elimina", danger: true });
    if (!ok) return;
    setCaricamento(true);
    setErrore(null);
    try {
      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Eliminazione fallita.");
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
      setCaricamento(false);
    }
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={elimina} loading={caricamento}>
        <Trash2 size={14} aria-hidden="true" /> Elimina
      </Button>
      {errore && <p className="error-msg">{errore}</p>}
      {dialog}
    </>
  );
}
