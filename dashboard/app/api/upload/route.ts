import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub, lanciaWorkflow } from "../../../lib/dataSource";

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
  }>;
}

// Il file è già su Cloudflare R2 a questo punto (caricato direttamente dal
// browser): qui riceviamo solo l'URL pubblico risultante e lo salviamo
// in data/media-library.json, che l'Agente Media legge in seguito.
export async function POST(req: Request) {
  const { url, filename, mimeType } = (await req.json()) as { url?: string; filename?: string; mimeType?: string };

  if (!url || !filename || !mimeType) {
    return NextResponse.json({ error: "Dati mancanti (url, filename, mimeType)." }, { status: 400 });
  }

  try {
    await aggiornaDatiSuGitHub<MediaLibraryFile>(
      "media-library.json",
      (attuale) => {
        attuale.items.push({
          id: randomUUID(),
          url,
          filename,
          mimeType,
          uploadedAt: new Date().toISOString(),
          usatoIl: null
        });
        return attuale;
      },
      `chore(media): carica "${filename}" dalla dashboard`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  // Avvia subito il ciclo giornaliero (stessa cosa già fatta per le foto
  // ricevute da Telegram) invece di aspettare il cron delle 08:00: così la
  // foto ha già la didascalia ed è visibile in "Anteprima" entro pochi
  // minuti, non entro il giorno dopo. Best-effort: se fallisce (es. token
  // senza permesso "Actions: write"), il ciclo automatico la prenderà
  // comunque al prossimo giro programmato.
  try {
    await lanciaWorkflow("daily-agents.yml");
  } catch {
    /* non bloccante */
  }

  return NextResponse.json({ ok: true });
}
