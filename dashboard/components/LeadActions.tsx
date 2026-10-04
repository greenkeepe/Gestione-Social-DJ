"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, X } from "lucide-react";
import { Button } from "./ui/Button";
import { useConfirm } from "./ui/ConfirmDialog";

// Il messaggio va comunque inviato a mano da Instagram/Facebook (nessuna API
// DM automatizzabile) — qui copiamo il testo e teniamo traccia dell'esito
// senza dover editare data/leads.json a mano come prima.
export function LeadActions({ id, messaggio }: { id: string; messaggio: string }) {
  const [copiato, setCopiato] = useState(false);
  const [caricamento, setCaricamento] = useState<"inviato" | "scartato" | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  async function copia() {
    try {
      await navigator.clipboard.writeText(messaggio);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      setErrore("Copia non riuscita: seleziona e copia il testo a mano.");
    }
  }

  async function aggiornaStato(status: "inviato" | "scartato") {
    if (status === "scartato") {
      const ok = await confirm({ title: "Scarta lead", message: "Scartare questa bozza? Resta comunque nello storico." });
      if (!ok) return;
    }
    setCaricamento(status);
    setErrore(null);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Aggiornamento fallito.");
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
    } finally {
      setCaricamento(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-sm mt-sm">
      <Button variant="secondary" size="sm" onClick={copia}>
        {copiato ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        {copiato ? "Copiato" : "Copia messaggio"}
      </Button>
      <Button size="sm" loading={caricamento === "inviato"} onClick={() => aggiornaStato("inviato")}>
        Segna come inviato
      </Button>
      <Button variant="ghost" size="sm" loading={caricamento === "scartato"} onClick={() => aggiornaStato("scartato")}>
        <X size={14} aria-hidden="true" /> Scarta
      </Button>
      {errore && <p className="error-msg" style={{ width: "100%" }}>{errore}</p>}
      {dialog}
    </div>
  );
}
