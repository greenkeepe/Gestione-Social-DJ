"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Bottone generico per eliminare una riga (media, contenuto in coda, job
// Reel AI) via l'API DELETE corrispondente. Chiede sempre conferma prima:
// l'eliminazione dai file dati (e dai file su R2 dove previsto) non è
// annullabile.
export function DeleteButton({ url, conferma = "Eliminare? Non si può annullare." }: { url: string; conferma?: string }) {
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const router = useRouter();

  async function elimina() {
    if (!window.confirm(conferma)) return;
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
      <button
        type="button"
        onClick={elimina}
        disabled={caricamento}
        className="upload-btn"
        style={{ background: "transparent", border: "1px solid #c0392b", color: "#c0392b" }}
      >
        {caricamento ? "..." : "🗑 Elimina"}
      </button>
      {errore && <p className="error-msg">{errore}</p>}
    </>
  );
}
