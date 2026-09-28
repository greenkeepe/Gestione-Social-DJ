"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Check, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "./ui/Button";
import { useConfirm } from "./ui/ConfirmDialog";

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
  const { confirm, dialog } = useConfirm();

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
    const ok = await confirm({
      title: "Svuota storage R2",
      message:
        "Cancella DAVVERO tutti i file da Cloudflare R2 (foto, video, Reel) e svuota le code (media, Reel, post in coda). Operazione irreversibile. Lo storico di ciò che è già stato pubblicato sui social non viene toccato.",
      confirmLabel: "Svuota tutto",
      danger: true
    });
    if (!ok) return;
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
    <div className="mt-md">
      <div className="flex gap-md flex-wrap" style={{ alignItems: "flex-end" }}>
        <label>
          <div className="note">{isR2 ? "Limite spazio (GB)" : "Limite chiamate al mese"}</div>
          <input type="number" min={isR2 ? "0.1" : "1"} step={isR2 ? "0.1" : "1"} value={valore} onChange={(e) => setValore(e.target.value)} style={{ width: 100 }} />
        </label>
        <label>
          <div className="note">Metti in pausa al (%)</div>
          <input type="number" min="1" max="100" step="1" value={soglia} onChange={(e) => setSoglia(e.target.value)} style={{ width: 100 }} />
        </label>
        <Button
          size="sm"
          loading={salvataggio}
          onClick={() =>
            invia(
              isR2
                ? { limiteBytes: Math.round(Number(valore) * GB), sogliaPercentualePausa: Number(soglia) }
                : { limiteChiamateMese: Math.round(Number(valore)), sogliaPercentualePausa: Number(soglia) }
            )
          }
        >
          Salva soglie
        </Button>
        {pausato && (
          <Button variant="secondary" size="sm" disabled={salvataggio} onClick={() => invia({ riprendi: true })}>
            <Play size={14} aria-hidden="true" /> Riprendi ora
          </Button>
        )}
      </div>
      {errore && <p className="error-msg">{errore}</p>}

      {isR2 && (
        <div className="danger-zone">
          <div className="danger-zone__title">
            <AlertTriangle size={16} aria-hidden="true" /> Zona pericolosa
          </div>
          <p className="note">Cancella tutti i file da R2 e svuota le code di media/Reel/post. Operazione irreversibile.</p>
          <Button variant="danger" size="sm" className="mt-sm" disabled={svuotamento !== "idle"} onClick={svuotaR2}>
            {svuotamento === "avviato" ? <Check size={14} aria-hidden="true" /> : <Trash2 size={14} aria-hidden="true" />}
            {svuotamento === "in-corso" ? "Avvio…" : svuotamento === "avviato" ? "Reset avviato" : "Svuota storage R2"}
          </Button>
          {svuotamento === "avviato" && (
            <p className="note mt-sm">
              Reset avviato su GitHub Actions (ci vuole circa un minuto): cancella tutti i file da R2 e svuota le code. Aggiorna la pagina tra
              poco per vedere lo spazio tornato a zero.
            </p>
          )}
        </div>
      )}
      {dialog}
    </div>
  );
}
