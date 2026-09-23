// Agente "Direttore" — orchestratore giornaliero. Esegue tutti gli agenti
// specializzati nell'ordine corretto (media -> contenuti -> lead -> analytics
// -> strategia). La pubblicazione vera e propria è gestita a parte da
// publishing-agent.ts, eseguito più volte al giorno per trovare l'orario
// migliore (vedi .github/workflows/publish-check.yml).
import "dotenv/config";
import { readData, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { inviaMessaggioTelegram } from "../lib/telegram.js";
import { IDENTITA } from "./identities.js";
import { eseguiMediaAgent } from "./media-agent.js";
import { eseguiContentAgent } from "./content-agent.js";
import { eseguiLeadsAgent } from "./leads-agent.js";
import { eseguiReplyAgent } from "./reply-agent.js";
import { eseguiAnalyticsAgent } from "./analytics-agent.js";
import { eseguiStrategyAgent } from "./strategy-agent.js";
import { eseguiNoteAgent } from "./note-agent.js";
import { eseguiSitoAgent } from "./sito-agent.js";

interface AgentRun {
  agente: string;
  status: "ok" | "errore" | "nessuna-azione";
  riepilogo: string;
  timestamp: string;
}

interface AgentRunsFile {
  runs: AgentRun[];
}

interface PostsQueueFile {
  queue: Array<{ status: string }>;
}

interface KpisFile {
  instagram: { followers: number | null };
  facebook: { followers: number | null };
}

const EMOJI_STATUS: Record<AgentRun["status"], string> = { ok: "✅", errore: "⚠️", "nessuna-azione": "· " };

async function inviaResocontoMattutino(dalTimestamp: string): Promise<void> {
  const [runsFile, queueFile, kpis] = await Promise.all([
    readData<AgentRunsFile>("agent-runs.json"),
    readData<PostsQueueFile>("posts-queue.json"),
    readData<KpisFile>("kpis.json").catch(() => null)
  ]);

  const runDiOggi = runsFile.runs.filter((r) => r.timestamp >= dalTimestamp);
  const righe = runDiOggi
    .filter((r) => r.agente !== IDENTITA.master.nome)
    .map((r) => `${EMOJI_STATUS[r.status]} ${r.agente}: ${r.riepilogo}`);

  const inCoda = queueFile.queue.filter((q) => q.status !== "pubblicato" && q.status !== "pubblicato-parziale").length;
  const inPausaOErrore = queueFile.queue.filter((q) => q.status.startsWith("in-pausa") || q.status === "errore").length;

  const testo = [
    "☀️ Buongiorno! Resoconto del ciclo agenti di stamattina:",
    "",
    ...righe,
    "",
    `📋 Contenuti in coda: ${inCoda}${inPausaOErrore > 0 ? ` (${inPausaOErrore} in pausa/errore da controllare)` : ""}`,
    kpis ? `📈 Follower: ${kpis.instagram.followers ?? "—"} Instagram, ${kpis.facebook.followers ?? "—"} Facebook` : null
  ]
    .filter((riga): riga is string => riga !== null)
    .join("\n");

  await inviaMessaggioTelegram(testo);
}

async function eseguiPasso(nome: string, fn: () => Promise<void>): Promise<void> {
  console.log(`\n[Direttore] → avvio ${nome}...`);
  try {
    await fn();
    console.log(`[Direttore] ✓ ${nome} completato.`);
  } catch (err) {
    // Ogni agente gestisce già i propri errori internamente e li logga;
    // qui evitiamo solo che un crash imprevisto blocchi gli agenti successivi.
    console.error(`[Direttore] ✗ ${nome} ha generato un errore non gestito:`, err);
  }
}

export async function eseguiMasterAgent(): Promise<void> {
  console.log("=== Direttore: avvio del ciclo giornaliero degli agenti ===");
  const inizioCiclo = nowIso();
  const oggi = inizioCiclo.slice(0, 10);

  // Se il cron di Vercel e lo schedule di GitHub Actions scattano entrambi
  // lo stesso giorno (rete di sicurezza voluta, vedi daily-agents.yml), il
  // ciclo gira innocuamente due volte — ma il resoconto mattutino su
  // Telegram no, altrimenti Andrea lo riceve doppio. Controllato PRIMA che
  // questo ciclo registri il proprio "Direttore ok" qui sotto.
  const runsGiaOggi = await readData<AgentRunsFile>("agent-runs.json").catch(() => ({ runs: [] }));
  const resocontoGiaInviatoOggi = runsGiaOggi.runs.some(
    (r) => r.agente === IDENTITA.master.nome && r.timestamp.startsWith(oggi)
  );

  await eseguiPasso("Agente Media (Occhio)", eseguiMediaAgent);
  await eseguiPasso("Agente Contenuti (Copy)", eseguiContentAgent);
  await eseguiPasso("Agente Vetrina (Sito)", eseguiSitoAgent);
  await eseguiPasso("Agente Lead (Cacciatore)", eseguiLeadsAgent);
  await eseguiPasso("Agente Risposte (Portavoce)", eseguiReplyAgent);
  await eseguiPasso("Agente Analytics (Analista)", eseguiAnalyticsAgent);
  await eseguiPasso("Agente Strategia (Stratega)", eseguiStrategyAgent);
  await eseguiPasso("Agente Note (Appunti)", eseguiNoteAgent);
  // L'Esploratore non gira più in automatico nel ciclo giornaliero: si
  // avvia solo a comando, con il tasto "Cerca nuovi locali" nella pagina
  // "Locali" della dashboard (vedi .github/workflows/outreach-search.yml).

  await logAgentRun({
    agente: IDENTITA.master.nome,
    identita: IDENTITA.master.ruolo,
    status: "ok",
    riepilogo: "Ciclo giornaliero completato: contenuto del giorno preparato, lead controllati, KPI e strategia aggiornati. La pubblicazione avverrà al prossimo controllo orario utile."
  });

  // Il resoconto via Telegram parte solo dal vero ciclo automatico delle
  // 06:00 (flag impostato da .github/workflows/daily-agents.yml in base a
  // github.event_name), mai dai lanci manuali/di test: altrimenti ogni
  // trigger manuale spammerebbe un resoconto in chat. E solo la prima volta
  // al giorno, anche se sia il cron di Vercel che lo schedule di GitHub
  // scattano lo stesso giorno (vedi controllo in cima alla funzione).
  if (process.env.MORNING_REPORT === "true" && !resocontoGiaInviatoOggi) {
    await inviaResocontoMattutino(inizioCiclo).catch((err) => {
      console.error("[Direttore] Invio resoconto mattutino Telegram fallito:", err);
    });
  }

  console.log("\n=== Direttore: ciclo completato ===");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiMasterAgent();
}
