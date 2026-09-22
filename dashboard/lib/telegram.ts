// Helper lato server per l'ingestion via Telegram (vedi
// app/api/telegram-webhook/route.ts). Un bot Telegram "personale" di Andrea:
// invia una foto o un video in chat e finisce automaticamente nella pipeline
// esistente (media-library.json o reel-jobs.json), senza passare dalla
// pagina "Carica media" della dashboard.
//
// Limite noto della Bot API di Telegram (non aggirabile senza un Bot API
// server self-hosted, fuori scope per un progetto a costo zero): i file
// scaricabili da un bot non possono superare i 20MB, anche se Telegram
// accetta upload molto più grandi in chat.
export const LIMITE_DOWNLOAD_BYTES = 20 * 1024 * 1024;

interface TelegramFileInfo {
  file_id: string;
  file_path?: string;
  file_size?: number;
}

function tokenBot(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN mancante.");
  return token;
}

// Equivalente di lib/telegram.ts (inviaMessaggioTelegram, usato dagli
// agenti su GitHub Actions): notifica Andrea sulla chat autorizzata, senza
// bisogno di conoscere il chatId di chi ha scritto. Del tutto opzionale: se
// TELEGRAM_BOT_TOKEN o TELEGRAM_ALLOWED_CHAT_ID non sono impostati, non fa
// nulla (nessun errore, nessun blocco).
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

export async function inviaMessaggio(chatId: number | string, testo: string): Promise<void> {
  const token = tokenBot();
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: testo })
    });
  } catch (err) {
    console.error("[Telegram] invio risposta fallito:", err);
  }
}

async function otteniFileInfo(fileId: string): Promise<TelegramFileInfo> {
  const token = tokenBot();
  const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const json = (await res.json()) as { ok: boolean; result?: TelegramFileInfo; description?: string };
  if (!res.ok || !json.ok || !json.result) {
    throw new Error(`getFile fallito: ${json.description ?? res.status}`);
  }
  return json.result;
}

// Scarica un file da Telegram (foto/video/documento) verificando prima che
// resti sotto il limite di 20MB della Bot API. Ritorna i byte grezzi pronti
// per essere caricati su R2.
export async function scaricaFileTelegram(fileId: string): Promise<{ buffer: Buffer; filePath: string }> {
  const info = await otteniFileInfo(fileId);
  if (!info.file_path) throw new Error("Telegram non ha restituito il percorso del file.");
  if (info.file_size && info.file_size > LIMITE_DOWNLOAD_BYTES) {
    throw new Error("FILE_TROPPO_GRANDE");
  }

  const token = tokenBot();
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${info.file_path}`);
  if (!res.ok) throw new Error(`Download da Telegram fallito (${res.status}).`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.byteLength > LIMITE_DOWNLOAD_BYTES) throw new Error("FILE_TROPPO_GRANDE");

  return { buffer, filePath: info.file_path };
}

export function chatAutorizzata(chatId: number | string | undefined): boolean {
  const consentito = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!consentito) return false; // per sicurezza, senza whitelist configurata non si accetta nulla
  return String(chatId ?? "") === consentito;
}
