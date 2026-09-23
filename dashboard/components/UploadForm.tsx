"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { caricaSuR2 } from "../lib/r2Upload";

interface RigaFile {
  nome: string;
  stato: "in-coda" | "caricamento" | "fatto" | "errore";
  percentuale: number;
  errore?: string;
}

// Il file va direttamente dal browser a Cloudflare R2 (URL "presigned",
// nessun limite di dimensione pratico, nessuna credenziale esposta al
// browser — vedi lib/r2Upload.ts). Solo dopo, un piccolo messaggio JSON
// (senza il file) salva il riferimento in data/media-library.json.
//
// Upload multiplo: i file caricano UNO ALLA VOLTA (non in parallelo) per
// tenere una barra di avanzamento leggibile per ciascuno ed evitare di
// saturare la connessione con file video grandi caricati insieme. Un file
// che fallisce non blocca gli altri: resta segnato "errore" nella lista,
// il resto continua.
export function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [righe, setRighe] = useState<RigaFile[]>([]);
  const [inCorso, setInCorso] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const files = inputRef.current?.files;
    if (!files || files.length === 0) return;

    const lista = Array.from(files);
    setInCorso(true);
    setRighe(lista.map((f) => ({ nome: f.name, stato: "in-coda", percentuale: 0 })));

    for (let i = 0; i < lista.length; i++) {
      const file = lista[i];
      setRighe((prev) => prev.map((r, idx) => (idx === i ? { ...r, stato: "caricamento" } : r)));

      try {
        const url = await caricaSuR2(file, (percentuale) => {
          setRighe((prev) => prev.map((r, idx) => (idx === i ? { ...r, percentuale } : r)));
        });

        const metaRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url, filename: file.name, mimeType: file.type })
        });
        const metaJson = await metaRes.json();
        if (!metaRes.ok) throw new Error(metaJson.error ?? "Impossibile salvare il riferimento del media.");

        setRighe((prev) => prev.map((r, idx) => (idx === i ? { ...r, stato: "fatto", percentuale: 100 } : r)));
      } catch (err) {
        setRighe((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, stato: "errore", errore: err instanceof Error ? err.message : String(err) } : r))
        );
      }
    }

    setInCorso(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 24 }}>
      <div className="label">Carica una o più foto/video</div>
      <p className="note">Puoi selezionarne più di uno insieme: verranno messi in coda e usati dagli agenti uno al giorno, nell&apos;ordine in cui li carichi.</p>
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple required style={{ margin: "12px 0" }} />
      <br />
      <button type="submit" disabled={inCorso} className="upload-btn">
        {inCorso ? "Caricamento in corso…" : "Carica"}
      </button>

      {righe.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
          {righe.map((r, i) => (
            <li key={i} className="note" style={{ marginTop: 4 }}>
              {r.stato === "fatto" && "✅ "}
              {r.stato === "errore" && "❌ "}
              {r.stato === "caricamento" && `⏳ ${r.percentuale}% — `}
              {r.stato === "in-coda" && "⏳ "}
              {r.nome}
              {r.stato === "errore" && <span className="error-msg" style={{ display: "block" }}>{r.errore}</span>}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
