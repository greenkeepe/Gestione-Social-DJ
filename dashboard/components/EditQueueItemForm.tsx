"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  caption: string | null;
  hashtags: string[];
  orarioProgrammato: string | null;
  dataProgrammata?: string | null;
}

// Form di modifica per un contenuto ancora in coda: correggi a mano quello
// che gli agenti hanno scritto (didascalia, hashtag, data/orario) senza dover
// eliminare e ricaricare il media da capo.
export function EditQueueItemForm({ id, caption, hashtags, orarioProgrammato, dataProgrammata }: Props) {
  const [aperto, setAperto] = useState(false);
  const [testoCaption, setTestoCaption] = useState(caption ?? "");
  const [testoHashtag, setTestoHashtag] = useState(hashtags.join(" "));
  const [orario, setOrario] = useState(orarioProgrammato ?? "");
  const [data, setData] = useState(dataProgrammata ?? "");
  const [salvataggio, setSalvataggio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const router = useRouter();

  async function salva() {
    setSalvataggio(true);
    setErrore(null);
    try {
      const res = await fetch(`/api/queue/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caption: testoCaption,
          hashtags: testoHashtag.split(/\s+/).filter(Boolean),
          orarioProgrammato: orario || undefined,
          dataProgrammata: data || undefined
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Salvataggio fallito.");
      setAperto(false);
      router.refresh();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvataggio(false);
    }
  }

  if (!aperto) {
    return (
      <button type="button" className="upload-btn" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-dim)" }} onClick={() => setAperto(true)}>
        ✏️ Modifica
      </button>
    );
  }

  return (
    <div style={{ marginTop: 8, width: "100%" }}>
      <textarea
        value={testoCaption}
        onChange={(e) => setTestoCaption(e.target.value)}
        rows={3}
        style={{ width: "100%", marginBottom: 6 }}
      />
      <input
        type="text"
        value={testoHashtag}
        onChange={(e) => setTestoHashtag(e.target.value)}
        placeholder="#hashtag1 #hashtag2"
        style={{ width: "100%", marginBottom: 6 }}
      />
      <input
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
        style={{ marginBottom: 6, marginRight: 6 }}
      />
      <input
        type="time"
        value={orario}
        onChange={(e) => setOrario(e.target.value)}
        style={{ marginBottom: 6 }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button type="button" className="upload-btn" disabled={salvataggio} onClick={salva}>
          {salvataggio ? "..." : "Salva"}
        </button>
        <button
          type="button"
          className="upload-btn"
          style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-dim)" }}
          onClick={() => setAperto(false)}
        >
          Annulla
        </button>
      </div>
      {errore && <p className="error-msg">{errore}</p>}
    </div>
  );
}
