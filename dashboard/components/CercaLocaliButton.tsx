"use client";

import { useState } from "react";

// Avvia una ricerca on-demand (fino a 10 nuovi locali) invece del vecchio
// giro automatico giornaliero — vedi outreach-search.yml. La ricerca gira
// su GitHub Actions (qualche minuto): qui avviamo solo il workflow, i
// nuovi contatti compaiono in "Da rivedere" quando finisce.
export function CercaLocaliButton() {
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<string | null>(null);

  async function cerca() {
    setCaricamento(true);
    setErrore(null);
    setMessaggio(null);
    try {
      const res = await fetch("/api/outreach/cerca", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Avvio della ricerca fallito.");
      setMessaggio("Ricerca avviata! Richiede qualche minuto: torna su questa pagina e aggiorna per vedere i nuovi locali in \"Da rivedere\".");
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <button type="button" className="upload-btn" disabled={caricamento} onClick={cerca}>
        {caricamento ? "Avvio..." : "🔍 Cerca nuovi locali"}
      </button>
      <p className="note" style={{ marginTop: 6 }}>Propone fino a 10 nuovi ristoranti/hotel della zona ogni volta che tocchi il tasto — non gira più da solo ogni giorno.</p>
      {errore && <p className="error-msg">{errore}</p>}
      {messaggio && <p className="note">{messaggio}</p>}
    </div>
  );
}
