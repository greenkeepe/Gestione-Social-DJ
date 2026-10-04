"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import type { SeoProposal } from "../lib/types";
import { Button } from "./ui/Button";
import { StatusBadge } from "./ui/StatusBadge";
import { useConfirm } from "./ui/ConfirmDialog";
import { statusVocabulary } from "../lib/statusVocabulary";

// Una proposta = titolo/meta attuale vs proposto, modificabili prima di
// applicare (i campi partono già precompilati col testo proposto: se va
// bene così basta premere "Applica", altrimenti si corregge prima). Applica
// scrive DAVVERO in site/messages/it.json (vedi l'API route); Scarta lascia
// il sito invariato e segna la proposta come chiusa.
export function SeoProposalCard({ proposta }: { proposta: SeoProposal }) {
  const [title, setTitle] = useState(proposta.titleProposto);
  const [description, setDescription] = useState(proposta.descriptionProposta ?? "");
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  async function applica() {
    const ok = await confirm({
      title: "Applica sul sito",
      message: `Applicare questo titolo/meta sulla pagina "${proposta.pageLabel}" del sito? Verrà pubblicato al prossimo deploy.`,
      confirmLabel: "Applica"
    });
    if (!ok) return;
    setCaricamento(true);
    setErrore(null);
    try {
      const res = await fetch(`/api/seo/${proposta.id}/applica`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titleFinale: title, descriptionFinale: description })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Applicazione fallita.");
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
      setCaricamento(false);
    }
  }

  async function scarta() {
    const ok = await confirm({ title: "Scarta proposta", message: `Scartare questa proposta per "${proposta.pageLabel}" senza applicarla?`, danger: true, confirmLabel: "Scarta" });
    if (!ok) return;
    setCaricamento(true);
    setErrore(null);
    try {
      const res = await fetch(`/api/seo/${proposta.id}/scarta`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Operazione fallita.");
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
      setCaricamento(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="stat-top">
        <div className="label">
          {proposta.pageLabel} ({proposta.page || "/"})
        </div>
        <StatusBadge {...statusVocabulary.priority(proposta.priority)} />
      </div>
      <p className="note" style={{ marginTop: 8 }}>
        Query: <strong>&quot;{proposta.query}&quot;</strong> — {proposta.reason}
      </p>

      <div style={{ marginTop: 12 }}>
        <div className="label" style={{ marginBottom: 4 }}>Titolo attuale</div>
        <p className="note" style={{ marginBottom: 8 }}>{proposta.titleAttuale}</p>
        <div className="label" style={{ marginBottom: 4 }}>Titolo proposto (modificabile)</div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={70}
          style={{ width: "100%", marginBottom: 4 }}
        />
        <p className="note" style={{ fontSize: 12 }}>{title.length}/60 caratteri consigliati</p>
      </div>

      {proposta.metaDescriptionKey && (
        <div style={{ marginTop: 12 }}>
          <div className="label" style={{ marginBottom: 4 }}>Meta description attuale</div>
          <p className="note" style={{ marginBottom: 8 }}>{proposta.descriptionAttuale}</p>
          <div className="label" style={{ marginBottom: 4 }}>Meta description proposta (modificabile)</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={200}
            style={{ width: "100%", marginBottom: 4 }}
          />
          <p className="note" style={{ fontSize: 12 }}>{description.length}/155 caratteri consigliati</p>
        </div>
      )}

      <div className="flex gap-sm mt-md">
        <Button onClick={applica} loading={caricamento}>
          <Check size={14} aria-hidden="true" /> Applica sul sito
        </Button>
        <Button variant="danger" onClick={scarta} disabled={caricamento}>
          <X size={14} aria-hidden="true" /> Scarta
        </Button>
      </div>
      {errore && <p className="error-msg">{errore}</p>}
      {dialog}
    </div>
  );
}
