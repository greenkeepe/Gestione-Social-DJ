"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "./ui/Button";

// La ricerca gira già da sola ogni giorno (dentro il ciclo del Direttore),
// tenendo la coda "da rivedere" sempre piena fino al numero impostato qui
// sotto in "invio automatico" — questo tasto serve solo per un giro extra
// a comando, subito, senza aspettare il ciclo di domani. La ricerca gira
// su GitHub Actions (qualche minuto): qui avviamo solo il workflow, i
// nuovi contatti compaiono in "Da rivedere" quando finisce.
export function CercaLocaliButton() {
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<string | null>(null);

  async function cerca() {
    setCaricamento(true);
    setErrore(null);
    setMessaggio(null);
    try {
      const res = await fetch("/api/outreach/cerca", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Avvio della ricerca fallito.");
      setMessaggio("Ricerca avviata! Richiede qualche minuto: torna su questa pagina e aggiorna per vedere i nuovi locali in \"Da rivedere\".");
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <div className="mt-md">
      <Button onClick={cerca} loading={caricamento}>
        <Search size={14} aria-hidden="true" /> Cerca nuovi locali
      </Button>
      <p className="note mt-sm">Gira già da solo ogni giorno per tenere la coda piena: tocca qui solo per un giro extra subito.</p>
      {errore && <p className="error-msg">{errore}</p>}
      {messaggio && <p className="note">{messaggio}</p>}
    </div>
  );
}
