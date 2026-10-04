import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub, lanciaWorkflow } from "../../../../lib/dataSource";
import type { PostsQueueFile } from "../../../../lib/types";

export const runtime = "nodejs";

// Rielabora con Regia SOLO i contenuti scelti in Anteprima. Ogni contenuto
// scelto viene segnato con "regiaRichiesta" in posts-queue.json (così la
// richiesta non si perde anche se GitHub salta un'esecuzione), poi si avvia
// subito "AI Reel Maker" (scripts/regia-selezione.ts). Se l'avvio non
// riesce, ci pensa il cron ogni 15 minuti (api/cron/ogni-15-minuti).
const PUBBLICATI = new Set(["pubblicato", "pubblicato-parziale"]);
const MASSIMO = 30;

export async function POST(req: Request) {
  const { ids } = (await req.json().catch(() => ({}))) as { ids?: unknown };
  const scelti = Array.isArray(ids)
    ? [...new Set(ids.filter((x): x is string => typeof x === "string" && /^[\w.-]{1,120}$/.test(x)))]
    : [];
  if (!scelti.length) return NextResponse.json({ error: "Scegli almeno un contenuto." }, { status: 400 });
  if (scelti.length > MASSIMO) return NextResponse.json({ error: `Al massimo ${MASSIMO} contenuti alla volta.` }, { status: 400 });

  let segnati = 0;
  for (let tentativo = 1; ; tentativo++) {
    try {
      await aggiornaDatiSuGitHub<PostsQueueFile>(
        "posts-queue.json",
        (attuale) => {
          segnati = 0;
          const ora = new Date().toISOString();
          for (const item of attuale.queue) {
            if (!scelti.includes(item.id) || PUBBLICATI.has(item.status)) continue;
            item.regiaRichiesta = ora;
            delete item.regiaErrore;
            segnati++;
          }
          if (!segnati) throw new Error("NESSUNO");
          return attuale;
        },
        `chore(regia): ${scelti.length} contenuti scelti da rielaborare con Regia [skip ci]`
      );
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "NESSUNO") {
        return NextResponse.json({ error: "Nessuno dei contenuti scelti si può rielaborare: già pubblicati o non più in coda." }, { status: 409 });
      }
      // 409 = un agente ha appena salvato la coda: si riprova sui dati aggiornati
      if (!msg.includes("(409)") || tentativo >= 3) return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  let avviato = true;
  try {
    await lanciaWorkflow("reel-maker.yml");
  } catch {
    avviato = false; // lo avvia il cron entro 15 minuti
  }
  return NextResponse.json({ ok: true, segnati, avviato });
}
