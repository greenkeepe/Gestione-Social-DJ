import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub, lanciaWorkflow } from "../../../lib/dataSource";
import { chatAutorizzata, inviaMessaggio, scaricaFileTelegram } from "../../../lib/telegram";
import { caricaBufferSuR2 } from "../../../lib/r2Server";
import { r2Pausato } from "../../../lib/serviceLimits";
import type { ReelJobsFile } from "../../../lib/types";

export const runtime = "nodejs";

interface MediaLibraryFile {
  _istruzioni: string;
  items: Array<{
    id: string;
    url: string;
    filename: string;
    mimeType: string;
    uploadedAt: string;
    usatoIl: string | null;
    source?: string;
    istruzioniUtente?: string | null;
  }>;
}

interface TelegramPhotoSize {
  file_id: string;
  file_size?: number;
  width: number;
  height: number;
}

interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  video?: { file_id: string; mime_type?: string; file_size?: number; file_name?: string };
  document?: { file_id: string; mime_type?: string; file_size?: number; file_name?: string };
}

interface TelegramUpdate {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

function estensioneDaFilePath(filePath: string, fallback: string): string {
  const idx = filePath.lastIndexOf(".");
  return idx >= 0 ? filePath.slice(idx) : fallback;
}

// Ricezione diretta da Telegram: Andrea manda una foto o un video in chat al
// bot e finisce automaticamente nella stessa pipeline già usata dalla pagina
// "Carica media"/"Crea Reel AI" — nessun passaggio manuale dalla dashboard.
// Le foto vanno dritte in media-library.json (come un upload dashboard); i
// video passano dall'AI Reel Maker (reel-jobs.json) e, una volta montati,
// vengono promossi automaticamente a un post pronto (vedi reel-maker-agent.ts).
export async function POST(req: Request) {
  const secretAtteso = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secretAtteso) {
    const secretRicevuto = req.headers.get("x-telegram-bot-api-secret-token");
    if (secretRicevuto !== secretAtteso) {
      return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true }); // update non valido/ignorabile
  }

  const message = update.message ?? update.edited_message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  if (!chatAutorizzata(chatId)) {
    // Nessuna risposta: non vogliamo confermare a sconosciuti che il bot esiste/risponde.
    return NextResponse.json({ ok: true });
  }

  try {
    const caption = message.caption?.trim() || null;

    if ((message.photo?.length || message.video || message.document) && (await r2Pausato())) {
      await inviaMessaggio(
        chatId,
        "⏸️ Caricamento in pausa: lo spazio gratuito su Cloudflare R2 ha superato la soglia impostata. Libera spazio (elimina vecchi media dalla dashboard) o alza la soglia dalla pagina \"Utilizzo servizi\", poi riprova."
      );
      return NextResponse.json({ ok: true });
    }

    // Foto (album Telegram: usa la risoluzione più alta disponibile)
    if (message.photo && message.photo.length > 0) {
      const migliore = message.photo[message.photo.length - 1];
      const { buffer } = await scaricaFileTelegram(migliore.file_id);
      const url = await caricaBufferSuR2(buffer, "image/jpeg", ".jpg");
      const filename = `telegram-${Date.now()}.jpg`;

      await aggiornaDatiSuGitHub<MediaLibraryFile>(
        "media-library.json",
        (attuale) => {
          attuale.items.push({
            id: randomUUID(),
            url,
            filename,
            mimeType: "image/jpeg",
            uploadedAt: new Date().toISOString(),
            usatoIl: null,
            source: "telegram",
            istruzioniUtente: caption
          });
          return attuale;
        },
        `chore(media): foto ricevuta da Telegram`
      );

      try {
        await lanciaWorkflow("daily-agents.yml");
      } catch {
        /* non bloccante: il ciclo giornaliero la prenderà comunque */
      }

      await inviaMessaggio(chatId, "📸 Foto ricevuta! Scrivo la didascalia e la pubblico al momento migliore. La trovi in dashboard.");
      return NextResponse.json({ ok: true });
    }

    // Video (anche inviati come "documento" con mimeType video/*, per qualità piena)
    const videoSorgente = message.video ?? (message.document?.mime_type?.startsWith("video/") ? message.document : undefined);
    if (videoSorgente) {
      if (videoSorgente.file_size && videoSorgente.file_size > 20 * 1024 * 1024) {
        await inviaMessaggio(
          chatId,
          "⚠️ Questo video supera i 20MB: è il limite massimo che Telegram permette di scaricare a un bot. Prova a comprimerlo o a inviarlo più corto, oppure caricalo direttamente dalla pagina \"Crea Reel AI\" della dashboard."
        );
        return NextResponse.json({ ok: true });
      }

      let buffer: Buffer;
      try {
        ({ buffer } = await scaricaFileTelegram(videoSorgente.file_id));
      } catch (err) {
        if (err instanceof Error && err.message === "FILE_TROPPO_GRANDE") {
          await inviaMessaggio(
            chatId,
            "⚠️ Questo video supera i 20MB: è il limite massimo che Telegram permette di scaricare a un bot. Prova a comprimerlo o a inviarlo più corto, oppure caricalo direttamente dalla pagina \"Crea Reel AI\" della dashboard."
          );
          return NextResponse.json({ ok: true });
        }
        throw err;
      }

      const mimeType = videoSorgente.mime_type ?? "video/mp4";
      const filename = videoSorgente.file_name ?? `telegram-${Date.now()}.mp4`;
      const url = await caricaBufferSuR2(buffer, mimeType, estensioneDaFilePath(filename, ".mp4"));

      await aggiornaDatiSuGitHub<ReelJobsFile>(
        "reel-jobs.json",
        (attuale) => {
          attuale.jobs.unshift({
            id: randomUUID(),
            createdAt: new Date().toISOString(),
            videoUrl: url,
            filename,
            mimeType,
            profilo: "auto",
            istruzioni: caption,
            status: "in-coda-analisi",
            step: "in-coda",
            aggiornatoIl: new Date().toISOString(),
            erroreMessaggio: null,
            risultato: null,
            source: "telegram"
          });
          return attuale;
        },
        `chore(reel-ai): video ricevuto da Telegram`
      );

      try {
        await lanciaWorkflow("reel-maker.yml");
      } catch {
        /* non bloccante: gira comunque ogni ~20 minuti */
      }

      await inviaMessaggio(chatId, "🎬 Video ricevuto! Lo monto in un Reel e lo pubblico automaticamente appena pronto (di solito entro 20-30 minuti).");
      return NextResponse.json({ ok: true });
    }

    if (message.text) {
      await inviaMessaggio(chatId, "Inviami una foto o un video e penso io al resto: didascalia, montaggio e pubblicazione al momento migliore 🎧");
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Telegram webhook] errore:", err);
    const dettaglio = err instanceof Error ? err.message : String(err);
    await inviaMessaggio(chatId, `⚠️ Qualcosa è andato storto: ${dettaglio.slice(0, 300)}`).catch(() => {});
    return NextResponse.json({ ok: true });
  }
}
