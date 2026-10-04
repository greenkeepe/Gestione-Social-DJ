"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "./ui/Button";

const TIPI: { value: string; label: string }[] = [
  { value: "matrimonio", label: "Matrimonio" },
  { value: "compleanno", label: "Compleanno" },
  { value: "aziendale", label: "Aziendale" },
  { value: "party", label: "Party" },
  { value: "altro", label: "Altro" }
];

// Crea un evento e porta subito alla sua pagina: da lì il link personale
// (solo per i matrimoni) e il pulsante WhatsApp sono pronti all'uso.
export function NuovoEventoForm() {
  const [aperto, setAperto] = useState(false);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCaricamento(true);
    setErrore(null);
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());
    try {
      const res = await fetch("/api/eventi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Creazione fallita.");
      router.push(`/eventi/${json.evento.id}`);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
      setCaricamento(false);
    }
  }

  if (!aperto) {
    return (
      <Button onClick={() => setAperto(true)}>
        <Plus size={16} aria-hidden="true" /> Nuovo evento
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 24 }}>
      <div className="flex gap-xs" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="label">Nuovo evento</div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAperto(false)} aria-label="Chiudi">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="grid" style={{ marginTop: 12 }}>
        <div>
          <label htmlFor="tipo" className="note">Tipo evento *</label>
          <select id="tipo" name="tipo" required defaultValue="matrimonio">
            {TIPI.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cliente" className="note">Sposi/Cliente *</label>
          <input id="cliente" name="cliente" required placeholder="es. Marco &amp; Giulia" />
        </div>
        <div>
          <label htmlFor="data" className="note">Data evento *</label>
          <input id="data" name="data" type="date" required />
        </div>
        <div>
          <label htmlFor="telefono" className="note">Telefono (per WhatsApp)</label>
          <input id="telefono" name="telefono" type="tel" placeholder="+39 333 1234567" />
        </div>
        <div>
          <label htmlFor="email" className="note">Email</label>
          <input id="email" name="email" type="email" />
        </div>
        <div>
          <label htmlFor="location" className="note">Location</label>
          <input id="location" name="location" placeholder="se già nota" />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <label htmlFor="note" className="note">Note</label>
        <textarea id="note" name="note" rows={2} />
      </div>

      {errore && <p className="error-msg">{errore}</p>}

      <div style={{ marginTop: 12 }}>
        <Button type="submit" loading={caricamento}>Crea evento</Button>
      </div>
    </form>
  );
}
