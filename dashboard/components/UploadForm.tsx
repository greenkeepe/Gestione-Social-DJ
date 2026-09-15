"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Il file va direttamente dal browser a Cloudinary (nessun limite di
// dimensione lato server, nessun token segreto coinvolto: il "preset"
// pubblico basta). Solo dopo, un piccolo messaggio JSON (senza il file)
// salva il riferimento in data/media-library.json.
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stato, setStato] = useState<"inattivo" | "caricamento" | "errore">("inattivo");
  const [errore, setErrore] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setStato("errore");
      setErrore("Configurazione Cloudinary mancante (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET).");
      return;
    }

    setStato("caricamento");
    setErrore(null);

    try {
      const cloudinaryForm = new FormData();
      cloudinaryForm.append("file", file);
      cloudinaryForm.append("upload_preset", UPLOAD_PRESET);

      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
        method: "POST",
        body: cloudinaryForm
      });
      const cloudJson = await cloudRes.json();
      if (!cloudRes.ok) throw new Error(cloudJson.error?.message ?? "Caricamento su Cloudinary fallito.");

      const metaRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: cloudJson.secure_url, filename: file.name, mimeType: file.type })
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
        {stato === "caricamento" ? "Caricamento in corso…" : "Carica"}
      </button>
      {stato === "errore" && <p className="error-msg">{errore}</p>}
    </form>
  );
}
