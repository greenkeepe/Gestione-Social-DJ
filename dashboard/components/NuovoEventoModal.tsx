"use client";

import { useState } from "react";
import { X, PartyPopper } from "lucide-react";
import { Button } from "./ui/Button";
import type { Evento } from "../lib/types";

const TIPI: { value: string; label: string }[] = [
  { value: "matrimonio", label: "Matrimonio" },
  { value: "compleanno", label: "Compleanno" },
  { value: "aziendale", label: "Aziendale" },
  { value: "party", label: "Party" },
  { value: "altro", label: "Altro" }
];

export function NuovoEventoModal({
  aperto,
  dataIniziale,
  onClose,
  onCreato
}: {
  aperto: boolean;
  dataIniziale?: string;
  onClose: () => void;
  onCreato: (evento: Evento) => void;
}) {
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  if (!aperto) return null;

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
      onCreato(json.evento as Evento);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
      setCaricamento(false);
    }
  }

  return (
    <div className="confirm-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nuovo-evento-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <PartyPopper size={20} aria-hidden="true" className="modal-dialog__icon" />
            <h2 id="nuovo-evento-title" className="modal-dialog__title">
              Nuovo evento
            </h2>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Chiudi">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-dialog__body">
          <div className="field-grid">
            <div className="field">
              <label htmlFor="tipo">Tipo evento *</label>
              <select id="tipo" name="tipo" required defaultValue="matrimonio">
                {TIPI.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cliente">Sposi/Cliente *</label>
              <input id="cliente" name="cliente" required placeholder="es. Marco &amp; Giulia" autoFocus />
            </div>
            <div className="field">
              <label htmlFor="data">Data evento *</label>
              <input id="data" name="data" type="date" required defaultValue={dataIniziale} />
            </div>
            <div className="field">
              <label htmlFor="telefono">Telefono (per WhatsApp)</label>
              <input id="telefono" name="telefono" type="tel" placeholder="+39 333 1234567" />
            </div>
            <div className="field">
              <label htmlFor="email">Email (per invio via posta)</label>
              <input id="email" name="email" type="email" placeholder="sposi@esempio.it" />
            </div>
            <div className="field">
              <label htmlFor="location">Location</label>
              <input id="location" name="location" placeholder="se già nota" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="note">Note</label>
            <textarea id="note" name="note" rows={2} />
          </div>

          {errore && <p className="error-msg">{errore}</p>}

          <div className="modal-dialog__actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" loading={caricamento}>
              Crea evento
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
