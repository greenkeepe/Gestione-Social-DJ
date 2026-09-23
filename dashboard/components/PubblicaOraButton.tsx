"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Pubblica subito un contenuto "pronto" in coda, senza aspettare il
// prossimo controllo automatico — utile quando quel controllo tarda (il
// trigger "schedule" di GitHub Actions può arrivare in ritardo su
// repository con poca attività, vedi publish-check.yml) o semplicemente per
// scegliere a mano quando far uscire qualcosa. Pubblica per davvero su
// Instagram/Facebook: azione reale, non annullabile, quindi chiede sempre
// conferma prima.
export function PubblicaOraButton({ id }: { id: string }) {
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);
  const router = useRouter();

  async function pubblica() {
    if (!window.confirm("Pubblicare subito su Instagram e Facebook? È un'azione reale, non si può annullare.")) return;
    setCaricamento(true);
    setErrore(null);
    try {
      const res = await fetch(`/api/queue/${id}/pubblica`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Pubblicazione fallita.");
      setFatto(true);
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={pubblica}
        disabled={caricamento || fatto}
        className="upload-btn"
        style={{ background: "var(--accent)", border: "none" }}
      >
        {caricamento ? "..." : fatto ? "✅ Avviato" : "▶ Pubblica ora"}
      </button>
      {errore && <p className="error-msg">{errore}</p>}
      {fatto && <p className="note">In pubblicazione — aggiorna tra un minuto per vedere l&apos;esito.</p>}
    </div>
  );
}
