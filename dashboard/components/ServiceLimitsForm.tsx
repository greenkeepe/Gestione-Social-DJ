"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GB = 1024 * 1024 * 1024;

interface Props {
  servizio: "r2" | "anthropic";
  limite: number; // bytes per r2, chiamate/mese per anthropic
  sogliaPercentualePausa: number;
  pausato: boolean;
}

export function ServiceLimitsForm({ servizio, limite, sogliaPercentualePausa, pausato }: Props) {
  const isR2 = servizio === "r2";
  const [valore, setValore] = useState(String(isR2 ? Math.round((limite / GB) * 10) / 10 : limite));
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
        body: JSON.stringify({ servizio, ...body })
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
          <div className="note">{isR2 ? "Limite spazio (GB)" : "Limite chiamate al mese"}</div>
          <input type="number" min={isR2 ? "0.1" : "1"} step={isR2 ? "0.1" : "1"} value={valore} onChange={(e) => setValore(e.target.value)} style={{ width: 100 }} />
        </label>
        <label>
          <div className="note">Metti in pausa al (%)</div>
          <input type="number" min="1" max="100" step="1" value={soglia} onChange={(e) => setSoglia(e.target.value)} style={{ width: 100 }} />
        </label>
        <button
          type="button"
          className="upload-btn"
          disabled={salvataggio}
          onClick={() =>
            invia(
              isR2
                ? { limiteBytes: Math.round(Number(valore) * GB), sogliaPercentualePausa: Number(soglia) }
                : { limiteChiamateMese: Math.round(Number(valore)), sogliaPercentualePausa: Number(soglia) }
            )
          }
        >
          Salva soglie
        </button>
        {pausato && (
          <button type="button" className="upload-btn" disabled={salvataggio} onClick={() => invia({ riprendi: true })}>
            ▶️ Riprendi ora
          </button>
        )}
      </div>
      {errore && <p className="error-msg">{errore}</p>}
    </div>
  );
}
