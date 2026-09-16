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
