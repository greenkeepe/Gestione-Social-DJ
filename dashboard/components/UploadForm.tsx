"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { caricaSuR2 } from "../lib/r2Upload";

// Il file va direttamente dal browser a Cloudflare R2 (URL "presigned",
// nessun limite di dimensione pratico, nessuna credenziale esposta al
// browser — vedi lib/r2Upload.ts). Solo dopo, un piccolo messaggio JSON
// (senza il file) salva il riferimento in data/media-library.json.
export function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stato, setStato] = useState<"inattivo" | "caricamento" | "errore">("inattivo");
  const [percentuale, setPercentuale] = useState(0);
  const [errore, setErrore] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setStato("caricamento");
    setPercentuale(0);
    setErrore(null);

    try {
      const url = await caricaSuR2(file, setPercentuale);

      const metaRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, filename: file.name, mimeType: file.type })
      });
      const metaJson = await metaRes.json();
      if (!metaRes.ok) throw new Error(metaJson.error ?? "Impossibile salvare il riferimento del media.");

      setStato("inattivo");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
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
        {stato === "caricamento" ? `Caricamento in corso… ${percentuale}%` : "Carica"}
      </button>
      {stato === "errore" && <p className="error-msg">{errore}</p>}
    </form>
  );
}
