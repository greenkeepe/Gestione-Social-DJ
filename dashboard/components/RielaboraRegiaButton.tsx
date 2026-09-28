"use client";

import { useState } from "react";
import { Clapperboard, Check } from "lucide-react";
import { Button } from "./ui/Button";
import { useConfirm } from "./ui/ConfirmDialog";

// Rimonta con il motore "Regia" i Reel in coda non ancora pubblicati (dal
// video grezzo originale su R2). Didascalie, hashtag e orari restano quelli
// già decisi; cambia solo il video. Gira su GitHub Actions: ci vuole qualche
// minuto per ogni Reel, la pagina si aggiorna da sola al prossimo caricamento.
export function RielaboraRegiaButton() {
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);
  const { confirm, dialog } = useConfirm();

  async function avvia() {
    const ok = await confirm({
      title: "Rielabora con Regia",
      message: "Rimontare con Regia tutti i Reel in coda non ancora pubblicati? Didascalie e orari restano uguali, cambia solo il video. Ci vogliono alcuni minuti per ogni Reel.",
      confirmLabel: "Rielabora"
    });
    if (!ok) return;
    setCaricamento(true);
    setErrore(null);
    try {
      const res = await fetch("/api/regia/rielabora", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Avvio non riuscito.");
      setFatto(true);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <div>
      <Button onClick={avvia} disabled={fatto} loading={caricamento}>
        {fatto ? <Check size={14} aria-hidden="true" /> : <Clapperboard size={14} aria-hidden="true" />}
        {fatto ? "Rielaborazione avviata" : "Rielabora con Regia"}
      </Button>
      {errore && <p className="error-msg">{errore}</p>}
      {fatto && <p className="note">Regia sta rimontando i Reel: i nuovi video compaiono qui man mano che sono pronti.</p>}
      {dialog}
    </div>
  );
}
