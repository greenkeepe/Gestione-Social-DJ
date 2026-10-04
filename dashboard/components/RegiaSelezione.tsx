"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Check } from "lucide-react";
import { Button } from "./ui/Button";
import { useConfirm } from "./ui/ConfirmDialog";

// Scelta dei contenuti da rielaborare con Regia nella pagina Anteprima: una
// casella su ogni contenuto e il pulsante "Rielabora selezionati" in alto.
// Regia lavora SOLO quelli scelti (foto/card/screenshot -> nuovo Reel con un
// altro brano; video -> rimontato dal girato originale). Didascalie e orari
// restano uguali. Il lavoro gira su GitHub Actions: qualche minuto a contenuto.

interface Selezione {
  scelti: Set<string>;
  cambia: (id: string) => void;
  svuota: () => void;
}
const Contesto = createContext<Selezione | null>(null);

export function RegiaSelezioneProvider({ children }: { children: ReactNode }) {
  const [scelti, setScelti] = useState<Set<string>>(new Set());
  const cambia = (id: string) =>
    setScelti((prima) => {
      const dopo = new Set(prima);
      if (dopo.has(id)) dopo.delete(id);
      else dopo.add(id);
      return dopo;
    });
  return <Contesto.Provider value={{ scelti, cambia, svuota: () => setScelti(new Set()) }}>{children}</Contesto.Provider>;
}

// Casella su ogni contenuto (o lo stato del lavoro se Regia lo sta già rielaborando)
export function RegiaCasella({ id, inLavorazione, errore }: { id: string; inLavorazione: boolean; errore?: string }) {
  const sel = useContext(Contesto);
  if (!sel) return null;
  return (
    <div className="regia-casella">
      {inLavorazione ? (
        <span className="regia-casella__stato">
          <Clapperboard size={14} aria-hidden="true" /> Regia al lavoro: sarà pronto tra qualche minuto
        </span>
      ) : (
        <label>
          <input type="checkbox" checked={sel.scelti.has(id)} onChange={() => sel.cambia(id)} />
          Rielabora con Regia
        </label>
      )}
      {errore && !inLavorazione && <p className="error-msg">Ultima rielaborazione non riuscita: {errore}</p>}
    </div>
  );
}

export function RielaboraSelezionatiButton() {
  const sel = useContext(Contesto);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  if (!sel) return null;
  const n = sel.scelti.size;

  async function avvia() {
    if (!sel || !n) return;
    const ok = await confirm({
      title: "Rielabora con Regia",
      message: `Rimontare con Regia ${n === 1 ? "il contenuto scelto" : `i ${n} contenuti scelti`}? Didascalie e orari restano uguali, cambia solo il video. Ci vogliono alcuni minuti per ognuno.`,
      confirmLabel: "Rielabora"
    });
    if (!ok) return;
    setCaricamento(true);
    setErrore(null);
    setMessaggio(null);
    try {
      const res = await fetch("/api/regia/rielabora", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [...sel.scelti] })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Avvio non riuscito.");
      setMessaggio(
        json.avviato
          ? `Regia sta lavorando ${json.segnati === 1 ? "il contenuto scelto" : `i ${json.segnati} contenuti scelti`}: i nuovi video compaiono qui man mano che sono pronti.`
          : "Richiesta salvata: Regia parte entro 15 minuti."
      );
      sel.svuota();
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <div>
      <Button onClick={avvia} disabled={!n} loading={caricamento}>
        {messaggio && !n ? <Check size={14} aria-hidden="true" /> : <Clapperboard size={14} aria-hidden="true" />}
        {n ? `Rielabora selezionati (${n})` : "Rielabora selezionati"}
      </Button>
      {!n && !messaggio && !errore && <p className="note">Spunta &quot;Rielabora con Regia&quot; sui contenuti che vuoi rifare.</p>}
      {errore && <p className="error-msg">{errore}</p>}
      {messaggio && <p className="note">{messaggio}</p>}
      {dialog}
    </div>
  );
}
