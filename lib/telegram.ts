// Notifiche Telegram in uscita, usate dagli agenti (Editore, Regista) per
// avvisare Andrea quando succede qualcosa di rilevante (pubblicazione
// riuscita/parziale, Reel pronto...). Stesso bot usato per l'ingestion
// (dashboard/app/api/telegram-webhook), ma qui parliamo solo in uscita:
// nessuna credenziale server-only lascia mai GitHub Actions.
// Del tutto opzionale: se TELEGRAM_BOT_TOKEN o TELEGRAM_ALLOWED_CHAT_ID non
// sono impostati, la funzione non fa nulla (nessun errore, nessun blocco).
export async function inviaMessaggioTelegram(testo: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: testo })
    });
    if (!res.ok) {
      console.error("[Telegram] invio notifica fallito:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[Telegram] invio notifica fallito:", err);
  }
}

// Manda il media appena pubblicato (foto o video) direttamente in chat, con
// la stessa didascalia uscita sui social: così vedi subito cosa è stato
// pubblicato senza dover aprire Instagram/Facebook. I limiti di Telegram per
// la didascalia di un media (1024 caratteri) sono più stretti di quelli di
// un messaggio di testo (4096): viene troncata se necessario.
const LIMITE_CAPTION_MEDIA = 1024;

export async function inviaMediaTelegram(opts: { url: string; isVideo: boolean; caption: string }): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!token || !chatId) return;

  const captionTronca =
    opts.caption.length > LIMITE_CAPTION_MEDIA ? `${opts.caption.slice(0, LIMITE_CAPTION_MEDIA - 1)}…` : opts.caption;

  const metodo = opts.isVideo ? "sendVideo" : "sendPhoto";
  const campo = opts.isVideo ? "video" : "photo";

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, [campo]: opts.url, caption: captionTronca })
    });
    if (!res.ok) {
      console.error("[Telegram] invio media fallito:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[Telegram] invio media fallito:", err);
  }
}
