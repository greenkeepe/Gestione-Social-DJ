"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "./ui/Button";

export function ReelJobActions({ jobId, pronto }: { jobId: string; pronto: boolean }) {
  const [caricamento, setCaricamento] = useState<"usa" | "rigenera" | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const router = useRouter();

  async function esegui(azione: "usa" | "rigenera") {
    setCaricamento(azione);
    setErrore(null);
    setMessaggio(null);
    try {
      const res = await fetch(`/api/reel-jobs/${jobId}/${azione}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Operazione fallita.");

      if (azione === "usa") {
        setMessaggio(
          json.cicloAvviato
            ? "Fatto! Sto scrivendo la didascalia — tra 1-2 minuti apri la pagina Anteprima e aggiorna per vederla."
            : "Fatto! La didascalia verrà scritta al prossimo ciclo automatico (entro le prossime ore) — non sono riuscito ad avviarlo subito."
        );
      }
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
    } finally {
      setCaricamento(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-sm mt-sm">
      {pronto && (
        <Button size="sm" disabled={caricamento !== null} loading={caricamento === "usa"} onClick={() => esegui("usa")}>
          Usa per un post
        </Button>
      )}
      <Button variant="ghost" size="sm" disabled={caricamento !== null} loading={caricamento === "rigenera"} onClick={() => esegui("rigenera")}>
        Rigenera
      </Button>
      {errore && <p className="error-msg" style={{ width: "100%" }}>{errore}</p>}
      {messaggio && (
        <p className="note" style={{ width: "100%" }}>
          {messaggio} <Link href="/anteprima" style={{ color: "var(--accent)" }}>Vai ad Anteprima →</Link>
        </p>
      )}
    </div>
  );
}
