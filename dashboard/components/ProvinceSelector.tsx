"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PROVINCE } from "../lib/province";

const REGIONI = ["Piemonte", "Liguria", "Lombardia"];

// Tendina a selezione multipla per scegliere in quali province l'Agente
// Esploratore deve cercare — vedi agents/outreach-agent.ts > cercaCandidati.
// Nessuna selezione = torna al raggio intorno alla sede (comportamento di
// sempre).
export function ProvinceSelector({ selezionateIniziali }: { selezionateIniziali: string[] }) {
  const [selezionate, setSelezionate] = useState<string[]>(selezionateIniziali);
  const [salvataggio, setSalvataggio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const router = useRouter();

  function toggle(sigla: string) {
    setSelezionate((attuali) => (attuali.includes(sigla) ? attuali.filter((s) => s !== sigla) : [...attuali, sigla]));
  }

  async function salva() {
    setSalvataggio(true);
    setErrore(null);
    try {
      const res = await fetch("/api/outreach/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ province: selezionate })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Salvataggio fallito.");
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvataggio(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="label">Province in cui cercare</div>
      <p className="note">
        {selezionate.length === 0
          ? "Nessuna provincia scelta: l'Esploratore cerca nel raggio intorno alla tua sede (config/brand.json)."
          : `Cerca solo in: ${selezionate.join(", ")}.`}
      </p>
      {REGIONI.map((regione) => (
        <div key={regione} style={{ marginTop: 8 }}>
          <strong style={{ fontSize: 13 }}>{regione}</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 4 }}>
            {PROVINCE.filter((p) => p.regione === regione).map((p) => (
              <label key={p.sigla} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                <input type="checkbox" checked={selezionate.includes(p.sigla)} onChange={() => toggle(p.sigla)} />
                {p.nome}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button type="button" onClick={salva} disabled={salvataggio} className="upload-btn" style={{ marginTop: 12 }}>
        {salvataggio ? "Salvo..." : "Salva province"}
      </button>
      {errore && <p className="error-msg">{errore}</p>}
    </div>
  );
}
