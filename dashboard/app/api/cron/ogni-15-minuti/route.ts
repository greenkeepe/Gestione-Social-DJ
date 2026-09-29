import { NextResponse } from "next/server";
import { leggiDati, lanciaWorkflow } from "../../../../lib/dataSource";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Chiamata ogni 15 minuti da un cron esterno gratuito (cron-job.org), con
// l'header "Authorization: Bearer CRON_SECRET". Lo "schedule" di GitHub
// Actions su questo repository arriva con ore di ritardo (visto dal vivo: un
// Reel programmato alle 18:30 è uscito alle 02:19) e Vercel Cron sul piano
// gratuito gira solo una volta al giorno. Avvia i workflow SOLO se c'è
// davvero qualcosa da fare, così non si sprecano esecuzioni:
// - "Controllo pubblicazione": un contenuto pronto è nella sua finestra oraria
// - "AI Reel Maker" (Regia): video in coda da montare o foto da trasformare in Reel

interface QueueItem {
  status: string;
  formato?: string;
  dataProgrammata?: string | null;
  orarioProgrammato?: string | null;
  media?: { mimeType?: string; fotoReel?: string };
  regiaRichiesta?: string;
}

// Stesse regole dell'Editore (agents/publishing-agent.ts, TZ Europe/Rome):
// pubblica AL o DOPO l'orario scelto entro 300 minuti; i contenuti rimasti
// indietro da un giorno passato escono appena possibile; al massimo 1
// contenuto "evento" + 1 "sito" al giorno (il giorno di "già pubblicato" è
// quello UTC, come nell'Editore).
const FINESTRA_DOPO_MIN = 300;
const categoriaDi = (formato: unknown) => (formato === "sito" ? "sito" : "evento");

function adessoRoma(): { data: string; minuti: number } {
  const parti = Object.fromEntries(
    new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  return { data: `${parti.year}-${parti.month}-${parti.day}`, minuti: Number(parti.hour) * 60 + Number(parti.minute) };
}

async function workflowGiaAttivo(file: string): Promise<boolean> {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) return false;
  for (const stato of ["queued", "in_progress"]) {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${file}/runs?status=${stato}&per_page=1`, {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
      cache: "no-store"
    });
    if (res.ok && ((await res.json()) as { total_count: number }).total_count > 0) return true;
  }
  return false;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const esito: Record<string, string> = {};
  try {
    const [coda, reelJobs, pubblicati] = await Promise.all([
      leggiDati<{ queue: QueueItem[] }>("posts-queue.json"),
      leggiDati<{ jobs: Array<{ status: string }> }>("reel-jobs.json"),
      leggiDati<{ log: Array<{ timestamp?: string; formato?: string }> }>("published-log.json")
    ]);

    // 1. c'è un contenuto da pubblicare adesso?
    const { data: oggi, minuti: ora } = adessoRoma();
    const oggiUtc = new Date().toISOString().slice(0, 10);
    const giaUsciteOggi = new Set(
      pubblicati.log.filter((p) => typeof p.timestamp === "string" && p.timestamp.startsWith(oggiUtc)).map((p) => categoriaDi(p.formato))
    );
    const parziale = coda.queue.some((p) => p.status === "pubblicato-parziale");
    const daPubblicare = parziale || coda.queue.some((p) => {
      if (p.status !== "pronto" || !p.orarioProgrammato || giaUsciteOggi.has(categoriaDi(p.formato))) return false;
      if (p.dataProgrammata && p.dataProgrammata < oggi) return true; // rimasto indietro da un giorno passato
      if (p.dataProgrammata && p.dataProgrammata > oggi) return false;
      const [h, m] = p.orarioProgrammato.split(":").map(Number);
      const target = h * 60 + (m || 0);
      return ora >= target && ora <= target + FINESTRA_DOPO_MIN;
    });
    if (!daPubblicare) esito.pubblicazione = "niente da pubblicare adesso";
    else if (await workflowGiaAttivo("publish-check.yml")) esito.pubblicazione = "controllo già in corso";
    else { await lanciaWorkflow("publish-check.yml"); esito.pubblicazione = "avviato"; }

    // 2. c'è lavoro per Regia?
    const videoInCoda = reelJobs.jobs.some((j) => j.status === "in-coda-analisi");
    const nonPubblicato = (p: QueueItem) => !["pubblicato", "pubblicato-parziale"].includes(p.status);
    const fotoDaTrasformare = coda.queue.some((p) => nonPubblicato(p) && p.media?.mimeType?.startsWith("image/") && !p.media?.fotoReel);
    const sceltiInDashboard = coda.queue.some((p) => nonPubblicato(p) && p.regiaRichiesta);
    if (!videoInCoda && !fotoDaTrasformare && !sceltiInDashboard) esito.regia = "niente da montare";
    else if (await workflowGiaAttivo("reel-maker.yml")) esito.regia = "Regia già al lavoro";
    else {
      await lanciaWorkflow("reel-maker.yml");
      esito.regia = `avviato (${[videoInCoda && "video", fotoDaTrasformare && "foto", sceltiInDashboard && "scelti"].filter(Boolean).join(" + ")})`;
    }

    return NextResponse.json({ ok: true, ...esito });
  } catch (err) {
    return NextResponse.json({ ok: false, ...esito, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
