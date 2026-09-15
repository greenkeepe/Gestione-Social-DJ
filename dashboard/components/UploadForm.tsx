"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

export function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stato, setStato] = useState<"inattivo" | "caricamento" | "errore">("inattivo");
  const [errore, setErrore] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setStato("caricamento");
    setErrore(null);

    try {
      await upload(`media/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ filename: file.name, mimeType: file.type })
      });

      setStato("inattivo");
      if (inputRef.current) inputRef.current.value = "";
      // Il salvataggio dei metadati su GitHub avviene in background (callback
      // onUploadCompleted): un piccolo ritardo prima di aggiornare la lista
      // evita di non vedere subito il file appena caricato.
      setTimeout(() => router.refresh(), 2000);
    } catch (err) {
      setStato("errore");
      setErrore(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 24 }}>
      <div className="label">Carica una nuova foto o video</div>
      <p className="note">Verrà messa in coda e usata dagli agenti in uno dei prossimi giorni, nell'ordine in cui la carichi.</p>
      <input ref={inputRef} type="file" accept="image/*,video/*" required style={{ margin: "12px 0" }} />
      <br />
      <button type="submit" disabled={stato === "caricamento"} className="upload-btn">
        {stato === "caricamento" ? "Caricamento in corso…" : "Carica"}
      </button>
      {stato === "errore" && <p className="error-msg">{errore}</p>}
    </form>
  );
}
