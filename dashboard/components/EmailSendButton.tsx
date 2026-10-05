"use client";

import { useState } from "react";
import { Mail, Check } from "lucide-react";
import { Button } from "./ui/Button";

export function EmailSendButton({ id, email }: { id: string; email: string }) {
  const [caricamento, setCaricamento] = useState(false);
  const [inviata, setInviata] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  if (!email) {
    return <p className="note">Nessuna email salvata per questo evento.</p>;
  }

  async function invia() {
    setCaricamento(true);
    setErrore(null);
    try {
      const res = await fetch(`/api/eventi/${id}/invia-email`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Invio fallito.");
      setInviata(true);
      setTimeout(() => setInviata(false), 3000);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <div>
      <Button variant="secondary" onClick={invia} loading={caricamento}>
        {inviata ? <Check size={16} aria-hidden="true" /> : <Mail size={16} aria-hidden="true" />}
        {inviata ? "Email inviata!" : "Invia via email"}
      </Button>
      {errore && <p className="error-msg">{errore}</p>}
    </div>
  );
}
