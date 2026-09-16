"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GB = 1024 * 1024 * 1024;

export function ServiceLimitsForm({ limiteBytes, sogliaPercentualePausa, pausato }: { limiteBytes: number; sogliaPercentualePausa: number; pausato: boolean }) {
  const [limiteGb, setLimiteGb] = useState(String(Math.round((limiteBytes / GB) * 10) / 10));
  const [soglia, setSoglia] = useState(String(sogliaPercentualePausa));
  const [salvataggio, setSalvataggio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const router = useRouter();

  async function invia(body: Record<string, unknown>) {
    setSalvataggio(true);
    setErrore(null);
    try {
      const res = await fetch("/api/service-limits", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
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
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label>
          <div className="note">Limite spazio (GB)</div>
          <input type="number" min="0.1" step="0.1" value={limiteGb} onChange={(e) => setLimiteGb(e.target.value)} style={{ width: 100 }} />
        </label>
        <label>
          <div className="note">Metti in pausa al (%)</div>
          <input type="number" min="1" max="100" step="1" value={soglia} onChange={(e) => setSoglia(e.target.value)} style={{ width: 100 }} />
        </label>
        <button
          type="button"
          className="upload-btn"
          disabled={salvataggio}
          onClick={() => invia({ limiteBytes: Math.round(Number(limiteGb) * GB), sogliaPercentualePausa: Number(soglia) })}
        >
          Salva soglie
        </button>
        {pausato && (
          <button type="button" className="upload-btn" disabled={salvataggio} onClick={() => invia({ riprendi: true })}>
            ▶️ Riprendi caricamento ora
          </button>
        )}
      </div>
      {errore && <p className="error-msg">{errore}</p>}
    </div>
  );
}
