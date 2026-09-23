"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { caricaSuR2 } from "../lib/r2Upload";

interface RigaFile {
  nome: string;
  stato: "in-coda" | "conversione" | "caricamento" | "fatto" | "errore";
  percentuale: number;
  errore?: string;
}

function isHeic(file: File): boolean {
  return /^image\/hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

// heic2any (come molte librerie basate su WASM/libheif) a volte rifiuta la
// Promise con un oggetto semplice {code, message} invece che un vero Error:
// "err instanceof Error" è falso e String(err) darebbe "[object Object]",
// un errore illeggibile in dashboard. Qui si prende il messaggio ovunque si
// trovi.
function messaggioErrore(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// Le foto iPhone sono quasi sempre in formato HEIC: il browser spesso non
// gli assegna nessun "type" (causa l'errore "Dati mancanti" a valle) e,
// anche quando lo fa, Instagram/Facebook non accettano comunque HEIC per
// pubblicare — serve JPEG. Convertiamo qui, nel browser, PRIMA di caricare
// su R2: heic2any include il suo decoder (nessun browser sa leggere HEIC
// nativamente tranne Safari), quindi funziona ovunque allo stesso modo.
async function convertiSeHeic(file: File): Promise<File> {
  if (!isHeic(file)) return file;
  const heic2any = (await import("heic2any")).default;
  const risultato = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(risultato) ? risultato[0] : risultato;
  const nuovoNome = file.name.replace(/\.hei[cf]$/i, "") + ".jpg";
  return new File([blob], nuovoNome, { type: "image/jpeg" });
}

// Il file va direttamente dal browser a Cloudflare R2 (URL "presigned",
// nessun limite di dimensione pratico, nessuna credenziale esposta al
// browser — vedi lib/r2Upload.ts). Solo dopo, un piccolo messaggio JSON
// (senza il file) salva il riferimento — le FOTO in data/media-library.json
// (usate così come sono), i VIDEO in data/reel-jobs.json (li monta prima
// l'AI Reel Maker, come già succede per i video mandati su Telegram: un
// video grezzo caricato qui non va mai in coda per essere pubblicato tale
// e quale, passa sempre dal montaggio automatico).
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
      let file = lista[i];

      try {
        if (isHeic(file)) {
          setRighe((prev) => prev.map((r, idx) => (idx === i ? { ...r, stato: "conversione" } : r)));
          try {
            file = await convertiSeHeic(file);
          } catch (err) {
            throw new Error(`Conversione HEIC→JPEG fallita (${messaggioErrore(err)}). Prova a esportarla come JPEG dall'app Foto prima di caricarla.`);
          }
        }

        setRighe((prev) => prev.map((r, idx) => (idx === i ? { ...r, stato: "caricamento" } : r)));
        const url = await caricaSuR2(file, (percentuale) => {
          setRighe((prev) => prev.map((r, idx) => (idx === i ? { ...r, percentuale } : r)));
        });

        const isVideo = file.type.startsWith("video/");
        const mimeType = file.type || "application/octet-stream";
        const metaRes = await fetch(isVideo ? "/api/reel-jobs" : "/api/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            isVideo ? { url, filename: file.name, mimeType, profilo: "auto" } : { url, filename: file.name, mimeType }
          )
        });
        const metaJson = await metaRes.json();
        if (!metaRes.ok) throw new Error(metaJson.error ?? "Impossibile salvare il riferimento del media.");

        setRighe((prev) => prev.map((r, idx) => (idx === i ? { ...r, stato: "fatto", percentuale: 100 } : r)));
      } catch (err) {
        setRighe((prev) => prev.map((r, idx) => (idx === i ? { ...r, stato: "errore", errore: messaggioErrore(err) } : r)));
      }
    }

    setInCorso(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 24 }}>
      <div className="label">Carica una o più foto/video</div>
      <p className="note">
        Puoi selezionarne più di uno insieme. Le foto vengono messe in coda e usate dagli agenti uno al giorno, nell&apos;ordine in cui le carichi. I
        video passano automaticamente dall&apos;AI Reel Maker (pagina &ldquo;Crea Reel AI&rdquo;) per il montaggio, prima di essere pronti per un post.
      </p>
      <input ref={inputRef} type="file" accept="image/*,video/*,.heic,.heif" multiple required style={{ margin: "12px 0" }} />
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
              {r.stato === "conversione" && "🔄 Conversione HEIC→JPEG… "}
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
