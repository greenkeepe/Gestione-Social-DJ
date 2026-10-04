// Notifica Telegram in uscita per il sito (Netlify), equivalente di
// lib/telegram.ts (agenti) e dashboard/lib/telegram.ts (dashboard). Del
// tutto opzionale: se TELEGRAM_BOT_TOKEN o TELEGRAM_ALLOWED_CHAT_ID non sono
// configurati su Netlify, non fa nulla (nessun errore, nessun blocco per chi
// sta compilando il modulo).
export async function inviaMessaggioTelegram(testo: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: testo }),
    });
    if (!res.ok) {
      console.error("[Telegram] invio notifica fallito:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[Telegram] invio notifica fallito:", err);
  }
}
