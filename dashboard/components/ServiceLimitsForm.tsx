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
  const [svuotamento, setSvuotamento] = useState<"idle" | "in-corso" | "avviato">("idle");
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

  async function svuotaR2() {
    const confermato = window.confirm(
      "Cancella DAVVERO tutti i file da Cloudflare R2 (foto, video, Reel) e svuota le code (media, Reel, post in coda). Operazione irreversibile. Lo storico di ciò che è già stato pubblicato sui social non viene toccato.\n\nProcedere?"
    );
    if (!confermato) return;
    setSvuotamento("in-corso");
    setErrore(null);
    try {
      const res = await fetch("/api/service-limits/svuota-r2", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Avvio del reset fallito.");
      setSvuotamento("avviato");
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
      setSvuotamento("idle");
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
        {isR2 && (
          <button
            type="button"
            className="upload-btn"
            style={{ background: "#c0392b" }}
            disabled={svuotamento !== "idle"}
            onClick={svuotaR2}
          >
            {svuotamento === "in-corso" ? "Avvio…" : svuotamento === "avviato" ? "✅ Reset avviato" : "🗑️ Svuota storage R2"}
          </button>
        )}
      </div>
      {isR2 && svuotamento === "avviato" && (
        <p className="note" style={{ marginTop: 6 }}>
          Reset avviato su GitHub Actions (ci vuole circa un minuto): cancella tutti i file da R2 e svuota le code. Aggiorna la pagina tra
          poco per vedere lo spazio tornato a zero.
        </p>
      )}
      {errore && <p className="error-msg">{errore}</p>}
    </div>
  );
}
