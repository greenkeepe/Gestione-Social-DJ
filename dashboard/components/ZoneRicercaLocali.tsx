"use client";

import { useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";
import { PROVINCE } from "../lib/province";
import { Button } from "./ui/Button";

const REGIONI = ["Piemonte", "Liguria", "Lombardia"];
const RAGGI = [5, 10, 15, 20, 30, 40, 50];

// Dove l'Agente Esploratore cerca i locali che fanno eventi: città/paesi
// scritti a mano (ognuno con il raggio scelto) e/o intere province (cerca
// intorno al capoluogo). Tutto vuoto = raggio intorno alla sede.
// Vedi agents/outreach-agent.ts > zoneDaConfig.
export function ZoneRicercaLocali({
  cittaIniziali,
  raggioIniziale,
  provinceIniziali
}: {
  cittaIniziali: string[];
  raggioIniziale: number;
  provinceIniziali: string[];
}) {
  const [citta, setCitta] = useState<string[]>(cittaIniziali);
  const [nuova, setNuova] = useState("");
  const [raggio, setRaggio] = useState(raggioIniziale);
  const [province, setProvince] = useState<string[]>(provinceIniziali);
  const [mostraProvince, setMostraProvince] = useState(provinceIniziali.length > 0);
  const [salvataggio, setSalvataggio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(false);
  const router = useRouter();

  function aggiungi() {
    const nome = nuova.trim().replace(/\s+/g, " ");
    if (nome.length < 2) return;
    if (!citta.some((c) => c.toLowerCase() === nome.toLowerCase())) setCitta([...citta, nome]);
    setNuova("");
    setSalvato(false);
  }
  function invio(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      aggiungi();
    }
  }
  function toggleProvincia(sigla: string) {
    setProvince((attuali) => (attuali.includes(sigla) ? attuali.filter((s) => s !== sigla) : [...attuali, sigla]));
    setSalvato(false);
  }

  async function salva() {
    setSalvataggio(true);
    setErrore(null);
    try {
      // una città scritta ma non ancora aggiunta con "+" si salva comunque
      const daSalvare = nuova.trim() && !citta.includes(nuova.trim()) ? [...citta, nuova.trim()] : citta;
      const res = await fetch("/api/outreach/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ citta: daSalvare, raggioKm: raggio, province })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Salvataggio fallito.");
      setCitta(daSalvare);
      setNuova("");
      setSalvato(true);
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvataggio(false);
    }
  }

  const riepilogo = [
    ...citta.map((c) => `${c} (${raggio} km)`),
    ...province.map((s) => `provincia di ${PROVINCE.find((p) => p.sigla === s)?.nome ?? s}`)
  ];

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="label">Dove cercare i locali</div>
      <p className="note">
        {riepilogo.length === 0
          ? "Nessuna zona scelta: l'Esploratore cerca intorno alla tua sede."
          : `Cerca locali che fanno eventi in: ${riepilogo.join(", ")}.`}
      </p>

      <div className="zone-citta">
        {citta.map((c) => (
          <span key={c} className="zone-chip">
            {c}
            <button
              type="button"
              aria-label={`Togli ${c}`}
              onClick={() => {
                setCitta(citta.filter((x) => x !== c));
                setSalvato(false);
              }}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>

      <div className="zone-aggiungi">
        <input
          type="text"
          value={nuova}
          placeholder="Città o paese, es. Novi Ligure"
          onChange={(e) => setNuova(e.target.value)}
          onKeyDown={invio}
          aria-label="Città da aggiungere"
        />
        <Button onClick={aggiungi} disabled={nuova.trim().length < 2}>
          <Plus size={14} aria-hidden="true" /> Aggiungi
        </Button>
      </div>

      <label className="zone-raggio">
        Raggio intorno a ogni città:{" "}
        <select
          value={raggio}
          onChange={(e) => {
            setRaggio(Number(e.target.value));
            setSalvato(false);
          }}
        >
          {RAGGI.map((r) => (
            <option key={r} value={r}>
              {r} km
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="zone-link" onClick={() => setMostraProvince(!mostraProvince)}>
        {mostraProvince ? "Nascondi province" : "Oppure scegli intere province"}
      </button>
      {mostraProvince &&
        REGIONI.map((regione) => (
          <div key={regione} style={{ marginTop: 8 }}>
            <strong style={{ fontSize: 13 }}>{regione}</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 4 }}>
              {PROVINCE.filter((p) => p.regione === regione).map((p) => (
                <label key={p.sigla} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                  <input type="checkbox" checked={province.includes(p.sigla)} onChange={() => toggleProvincia(p.sigla)} />
                  {p.nome}
                </label>
              ))}
            </div>
          </div>
        ))}

      <div>
        <Button className="mt-md" onClick={salva} loading={salvataggio}>
          Salva zone
        </Button>
      </div>
      {salvato && <p className="note">Salvato: la prossima ricerca userà queste zone.</p>}
      {errore && <p className="error-msg">{errore}</p>}
    </div>
  );
}
