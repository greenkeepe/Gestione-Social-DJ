"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { caricaVideoSuCloudinary } from "../lib/cloudinaryUpload";

// Stesso meccanismo di UploadForm.tsx (upload diretto dal browser a
// Cloudinary, nessun limite di dimensione lato server grazie all'upload a
// blocchi per i file più pesanti — vedi lib/cloudinaryUpload.ts): qui il
// file finisce in data/reel-jobs.json invece che in data/media-library.json,
// così l'Agente Regista sa che è un video grezzo da elaborare, non un media
// già pronto da pubblicare.
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const PROFILI = [
  { valore: "auto", etichetta: "Automatico (consigliato)" },
  { valore: "dj_party", etichetta: "DJ / Party" },
  { valore: "wedding", etichetta: "Matrimonio" },
  { valore: "event", etichetta: "Evento" },
  { valore: "business", etichetta: "Aziendale" },
  { valore: "talking_head", etichetta: "Persona che parla in camera" },
  { valore: "promotional", etichetta: "Promozionale" }
];

export function ReelUploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [profilo, setProfilo] = useState("auto");
  const [istruzioni, setIstruzioni] = useState("");
  const [stato, setStato] = useState<"inattivo" | "caricamento" | "errore">("inattivo");
  const [percentuale, setPercentuale] = useState(0);
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
    setPercentuale(0);
    setErrore(null);

    try {
      const url = await caricaVideoSuCloudinary(file, CLOUD_NAME, UPLOAD_PRESET, setPercentuale);

      const jobRes = await fetch("/api/reel-jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, filename: file.name, mimeType: file.type, profilo, istruzioni })
      });
      const jobJson = await jobRes.json();
      if (!jobRes.ok) throw new Error(jobJson.error ?? "Impossibile mettere in coda il video.");

      setStato("inattivo");
      setIstruzioni("");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setStato("errore");
      setErrore(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 24 }}>
      <div className="label">Carica un video grezzo</div>
      <p className="note">
        Il Regista (Agente AI Reel Maker) analizza il video, sceglie i momenti migliori e monta un Reel verticale pronto per i social.
        L&apos;elaborazione avviene in background (entro circa 20 minuti) — trovi il risultato qui sotto.
      </p>
      <input ref={inputRef} type="file" accept="video/*" required style={{ margin: "12px 0" }} />
      <br />

      <label className="label" htmlFor="profilo-reel">Stile del contenuto</label>
      <br />
      <select id="profilo-reel" value={profilo} onChange={(e) => setProfilo(e.target.value)} style={{ margin: "8px 0 16px", padding: 8, borderRadius: 8, background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}>
        {PROFILI.map((p) => (
          <option key={p.valore} value={p.valore}>{p.etichetta}</option>
        ))}
      </select>
      <br />

      <label className="label" htmlFor="istruzioni-reel">Note per il montaggio (facoltativo)</label>
      <br />
      <textarea
        id="istruzioni-reel"
        value={istruzioni}
        onChange={(e) => setIstruzioni(e.target.value)}
        placeholder="Es. è il momento del primo ballo, oppure: metti in evidenza il pubblico che balla"
        rows={2}
        style={{ width: "100%", margin: "8px 0 16px", padding: 8, borderRadius: 8, background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", fontFamily: "inherit" }}
      />

      <button type="submit" disabled={stato === "caricamento"} className="upload-btn">
        {stato === "caricamento" ? `Caricamento in corso… ${percentuale}%` : "🎬 Crea Reel AI"}
      </button>
      {stato === "errore" && <p className="error-msg">{errore}</p>}
    </form>
  );
}
