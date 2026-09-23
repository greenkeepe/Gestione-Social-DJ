import type { QueueItem } from "../lib/types";
import { PubblicaOraButton } from "./PubblicaOraButton";

const STATUS_LABEL: Record<string, string> = {
  "in-coda-caption": "in attesa di didascalia",
  pronto: "pronto",
  "in-pubblicazione": "in pubblicazione",
  pubblicato: "pubblicato"
};

// Un contenuto "pronto" la cui data programmata è oggi (o un giorno
// passato, es. un ciclo saltato) non è più solo "in calendario per dopo":
// è il turno di adesso, publishing-agent.ts lo pubblica al prossimo
// controllo utile. La dashboard lo segnala con un badge diverso, invece di
// mostrare lo stesso "pronto" sia per un contenuto fra tre settimane sia
// per uno che sta per uscire.
function statoVisualizzato(item: { status: string; dataProgrammata?: string | null }): string {
  if (item.status !== "pronto" || !item.dataProgrammata) return item.status;
  const oggi = new Date().toISOString().slice(0, 10);
  return item.dataProgrammata <= oggi ? "in-pubblicazione" : "pronto";
}

function IconCuore() {
  return (
    <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
  );
}
function IconCommento() {
  return (
    <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
  );
}
function IconInvia() {
  return (
    <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
  );
}
function IconSalva() {
  return (
    <svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
  );
}

export function PostPreview({ item, handle, nomeArte }: { item: QueueItem; handle: string; nomeArte: string }) {
  const isVideo = item.media.mimeType.startsWith("video/");
  const isReel = item.formato === "reel";
  const iniziale = (nomeArte || "DJ").charAt(0).toUpperCase();
  const stato = statoVisualizzato(item);

  return (
    <div className="ig-post">
      <div className="ig-post__header">
        <div className="ig-post__avatar">{iniziale}</div>
        <div className="ig-post__handle">{handle}</div>
        <span className={`ig-post__badge ${stato}`}>{STATUS_LABEL[stato] ?? stato}</span>
      </div>

      {isVideo ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video className={`ig-post__media ${isReel ? "reel" : ""}`} src={item.media.downloadUrl} controls muted />
      ) : (
        <img className={`ig-post__media ${isReel ? "reel" : ""}`} src={item.media.downloadUrl} alt={item.media.filename} />
      )}

      <div className="ig-post__actions">
        <IconCuore />
        <IconCommento />
        <IconInvia />
        <span className="spacer" />
        <IconSalva />
      </div>

      <div className="ig-post__caption">
        {item.caption ? (
          <>
            <strong>{handle}</strong> {item.caption}
            {item.hashtags && item.hashtags.length > 0 && (
              <>
                {" "}
                <span className="ig-post__hashtags">{item.hashtags.join(" ")}</span>
              </>
            )}
          </>
        ) : (
          <span className="placeholder">Didascalia non ancora scritta — sarà generata dall'Agente Copy.</span>
        )}
      </div>

      <div className="ig-post__meta">
        {item.formato === "reel" ? "Reel" : "Post"}
        {item.orarioProgrammato
          ? ` · programmato per ${item.dataProgrammata ? `il ${new Date(`${item.dataProgrammata}T00:00:00`).toLocaleDateString("it-IT")} ` : ""}alle ${item.orarioProgrammato}`
          : ""}
      </div>

      {item.status === "pronto" && <PubblicaOraButton id={item.id} />}
    </div>
  );
}
