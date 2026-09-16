"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReelJobActions({ jobId, pronto }: { jobId: string; pronto: boolean }) {
  const [caricamento, setCaricamento] = useState<"usa" | "rigenera" | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const router = useRouter();

  async function esegui(azione: "usa" | "rigenera") {
    setCaricamento(azione);
    setErrore(null);
    try {
      const res = await fetch(`/api/reel-jobs/${jobId}/${azione}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Operazione fallita.");
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
    } finally {
      setCaricamento(null);
    }
  }

  return (
    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
      {pronto && (
        <button className="upload-btn" disabled={caricamento !== null} onClick={() => esegui("usa")}>
          {caricamento === "usa" ? "..." : "Usa per un post"}
        </button>
      )}
      <button
        className="upload-btn"
        style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-dim)" }}
        disabled={caricamento !== null}
        onClick={() => esegui("rigenera")}
      >
        {caricamento === "rigenera" ? "..." : "Rigenera"}
      </button>
      {errore && <p className="error-msg" style={{ width: "100%" }}>{errore}</p>}
    </div>
  );
}
