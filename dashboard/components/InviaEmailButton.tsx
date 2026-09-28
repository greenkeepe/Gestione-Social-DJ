"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, X } from "lucide-react";
import { Button } from "./ui/Button";
import { useConfirm } from "./ui/ConfirmDialog";

// Un tap = invio reale dell'email (nessun copia-incolla, nessuna finestra
// di Gmail da aprire) — vedi dashboard/lib/email.ts. Chiede sempre conferma
// prima: dopo l'invio non si può annullare.
export function InviaEmailButton({ id, nomeLocale }: { id: string; nomeLocale: string }) {
  const [caricamento, setCaricamento] = useState<"invia" | "scarta" | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  async function invia() {
    const ok = await confirm({
      title: "Invia email",
      message: `Inviare davvero questa email a "${nomeLocale}"? Non si può annullare.`,
      confirmLabel: "Invia"
    });
    if (!ok) return;
    setCaricamento("invia");
    setErrore(null);
    try {
      const res = await fetch(`/api/outreach/${id}/invia`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Invio fallito.");
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
      setCaricamento(null);
    }
  }

  async function scarta() {
    const ok = await confirm({ title: "Scarta bozza", message: `Scartare la bozza per "${nomeLocale}" senza inviarla?`, danger: true, confirmLabel: "Scarta" });
    if (!ok) return;
    setCaricamento("scarta");
    setErrore(null);
    try {
      const res = await fetch(`/api/outreach/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Operazione fallita.");
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
      setCaricamento(null);
    }
  }

  return (
    <div className="flex gap-sm mt-sm">
      <Button size="sm" onClick={invia} disabled={caricamento !== null} loading={caricamento === "invia"}>
        <Mail size={14} aria-hidden="true" /> Invia
      </Button>
      <Button variant="danger" size="sm" onClick={scarta} disabled={caricamento !== null} loading={caricamento === "scarta"}>
        <X size={14} aria-hidden="true" /> Scarta
      </Button>
      {errore && <p className="error-msg">{errore}</p>}
      {dialog}
    </div>
  );
}
