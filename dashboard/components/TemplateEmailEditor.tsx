"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Modello unico usato sia per le bozze dell'Esploratore sia per l'invio
// automatico del Postino: {{LOCALE}} è l'unica parte che cambia da
// un'email all'altra, sostituita col nome del locale. La firma coi
// contatti veri (telefono/email/social) viene aggiunta da soli, non va
// scritta qui. Ogni salvataggio conta come "validazione": solo dopo aver
// salvato almeno una volta l'invio automatico può essere attivato.
export function TemplateEmailEditor({
  oggettoIniziale,
  corpoIniziale,
  validatoIl
}: {
  oggettoIniziale: string;
  corpoIniziale: string;
  validatoIl: string | null;
}) {
  const [oggetto, setOggetto] = useState(oggettoIniziale);
  const [corpo, setCorpo] = useState(corpoIniziale);
  const [salvataggio, setSalvataggio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const router = useRouter();

  async function salva() {
    setSalvataggio(true);
    setErrore(null);
    try {
      const res = await fetch("/api/outreach/template", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ oggetto, corpo })
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
      <div className="label">Modello email (usato per bozze e invio automatico)</div>
      <p className="note">
        Usa <code>{"{{LOCALE}}"}</code> dove vuoi che compaia il nome del locale — è l&apos;unica parte che cambia da un&apos;email
        all&apos;altra. Non serve scrivere la firma: telefono, email e social vengono aggiunti da soli.
      </p>
      <p className="note">
        {validatoIl
          ? `Validato l'ultima volta il ${new Date(validatoIl).toLocaleString("it-IT")}.`
          : "Non ancora validato: salvalo almeno una volta prima di attivare l'invio automatico qui sotto."}
      </p>

      <label style={{ display: "block", marginTop: 8, fontSize: 13 }}>
        Oggetto
        <input
          type="text"
          value={oggetto}
          onChange={(e) => setOggetto(e.target.value)}
          style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
        />
      </label>

      <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
        Corpo
        <textarea
          value={corpo}
          onChange={(e) => setCorpo(e.target.value)}
          rows={10}
          style={{ display: "block", width: "100%", marginTop: 4, padding: 8, fontFamily: "inherit" }}
        />
      </label>

      <button type="button" onClick={salva} disabled={salvataggio} className="upload-btn" style={{ marginTop: 12 }}>
        {salvataggio ? "Salvo..." : "Salva e valida modello"}
      </button>
      {errore && <p className="error-msg">{errore}</p>}
    </div>
  );
}
