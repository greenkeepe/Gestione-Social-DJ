"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Un tap = invio reale dell'email (nessun copia-incolla, nessuna finestra
// di Gmail da aprire) — vedi dashboard/lib/email.ts. Chiede sempre conferma
// prima: dopo l'invio non si può annullare.
export function InviaEmailButton({ id, nomeLocale }: { id: string; nomeLocale: string }) {
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const router = useRouter();

  async function invia() {
    if (!window.confirm(`Inviare davvero questa email a "${nomeLocale}"? Non si può annullare.`)) return;
    setCaricamento(true);
    setErrore(null);
    try {
      const res = await fetch(`/api/outreach/${id}/invia`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Invio fallito.");
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
      setCaricamento(false);
    }
  }

  async function scarta() {
    if (!window.confirm(`Scartare la bozza per "${nomeLocale}" senza inviarla?`)) return;
    setCaricamento(true);
    setErrore(null);
    try {
      const res = await fetch(`/api/outreach/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Operazione fallita.");
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
      setCaricamento(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <button type="button" onClick={invia} disabled={caricamento} className="upload-btn">
        {caricamento ? "..." : "📧 Invia"}
      </button>
      <button
        type="button"
        onClick={scarta}
        disabled={caricamento}
        className="upload-btn"
        style={{ background: "transparent", border: "1px solid #c0392b", color: "#c0392b" }}
      >
        Scarta
      </button>
      {errore && <p className="error-msg">{errore}</p>}
    </div>
  );
}
