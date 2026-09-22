"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MAX_CONSENTITO_AL_GIORNO = 20;

// Attiva/disattiva l'invio automatico delle bozze già pronte e ne fissa il
// limite giornaliero. Gira una volta al giorno (dashboard/app/api/cron/
// outreach-auto-send), sempre col modello validato in
// TemplateEmailEditor — mai testo diverso, mai due volte allo stesso
// indirizzo (vedi il controllo nel cron).
export function InvioAutomaticoSettings({
  attivoIniziale,
  maxAlGiornoIniziale,
  modelloValidato
}: {
  attivoIniziale: boolean;
  maxAlGiornoIniziale: number;
  modelloValidato: boolean;
}) {
  const [attivo, setAttivo] = useState(attivoIniziale);
  const [maxAlGiorno, setMaxAlGiorno] = useState(maxAlGiornoIniziale);
  const [salvataggio, setSalvataggio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const router = useRouter();

  async function salva(nuovoAttivo: boolean, nuovoMax: number) {
    setSalvataggio(true);
    setErrore(null);
    try {
      const res = await fetch("/api/outreach/invio-automatico", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attivo: nuovoAttivo, maxAlGiorno: nuovoMax })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Salvataggio fallito.");
      setAttivo(nuovoAttivo);
      setMaxAlGiorno(nuovoMax);
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvataggio(false);
    }
  }

  function toggleAttivo() {
    const nuovoValore = !attivo;
    if (nuovoValore) {
      if (!modelloValidato) {
        setErrore("Salva e valida prima un modello email qui sopra: senza, l'invio automatico non può partire.");
        return;
      }
      if (
        !window.confirm(
          `Attivare l'invio automatico? Ogni giorno partiranno da sole fino a ${maxAlGiorno} email (quelle più vecchie tra le bozze "da rivedere"), senza che tu le legga prima. Puoi disattivarlo in ogni momento.`
        )
      ) {
        return;
      }
    }
    salva(nuovoValore, maxAlGiorno);
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="label">Invio automatico</div>
      <p className="note">
        {attivo
          ? `Attivo: ogni giorno partono da sole fino a ${maxAlGiorno} email, prese tra le bozze più vecchie in "Da rivedere".`
          : "Disattivato: ogni bozza resta da inviare a mano, un tap alla volta."}
      </p>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13 }}>
        <input type="checkbox" checked={attivo} onChange={toggleAttivo} disabled={salvataggio} />
        Attiva invio automatico
      </label>

      <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
        Quante email al giorno (0–{MAX_CONSENTITO_AL_GIORNO})
        <input
          type="number"
          min={0}
          max={MAX_CONSENTITO_AL_GIORNO}
          value={maxAlGiorno}
          onChange={(e) => setMaxAlGiorno(Math.max(0, Math.min(MAX_CONSENTITO_AL_GIORNO, Number(e.target.value) || 0)))}
          style={{ display: "block", width: 100, marginTop: 4, padding: 8 }}
        />
      </label>

      <button
        type="button"
        onClick={() => salva(attivo, maxAlGiorno)}
        disabled={salvataggio}
        className="upload-btn"
        style={{ marginTop: 12 }}
      >
        {salvataggio ? "Salvo..." : "Salva limite giornaliero"}
      </button>
      {errore && <p className="error-msg">{errore}</p>}
    </div>
  );
}
