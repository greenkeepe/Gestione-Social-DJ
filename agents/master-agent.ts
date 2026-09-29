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
import { eseguiOutreachAgent } from "./outreach-agent.js";
import { innescaWorkflow } from "../lib/gitCommit.js";

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

const RIEPILOGO_CICLO_COMPLETO = "Ciclo giornaliero completato";
const dataRoma = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(d); // AAAA-MM-GG

export async function eseguiMasterAgent(): Promise<void> {
  const inizioCiclo = nowIso();
  const oggi = dataRoma(new Date());

  // Questo workflow parte più volte al giorno: il cron del mattino (Vercel,
  // più lo schedule di GitHub come riserva) e ogni caricamento/Reel/messaggio
  // Telegram, per scrivere subito la didascalia. Il ciclo COMPLETO (sito,
  // lead, risposte, analytics, strategia, note, locali) serve una volta al
  // giorno: prima girava a ogni avvio, raddoppiando le chiamate all'AI. Dal
  // secondo avvio della giornata si fa solo il "giro rapido": Occhio + Copy
  // (didascalie dei nuovi contenuti) e il controllo pubblicazione.
  // CICLO_COMPLETO=true (avvio manuale da GitHub) forza il ciclo completo.
  const runsGiaOggi = await readData<AgentRunsFile>("agent-runs.json").catch(() => ({ runs: [] as AgentRun[] }));
  const completoGiaFattoOggi = runsGiaOggi.runs.some(
    (r) => r.agente === IDENTITA.master.nome && r.riepilogo.startsWith(RIEPILOGO_CICLO_COMPLETO) && dataRoma(new Date(r.timestamp)) === oggi
  );
  const completo = !completoGiaFattoOggi || process.env.CICLO_COMPLETO === "true";
  console.log(`=== Direttore: avvio del ${completo ? "ciclo giornaliero completo" : "giro rapido (didascalie e pubblicazione)"} ===`);

  await eseguiPasso("Agente Media (Occhio)", eseguiMediaAgent);
  await eseguiPasso("Agente Contenuti (Copy)", eseguiContentAgent);

  if (!completo) {
    await logAgentRun({
      agente: IDENTITA.master.nome,
      identita: IDENTITA.master.ruolo,
      status: "ok",
      riepilogo: "Giro rapido: didascalie dei nuovi contenuti controllate (il ciclo completo è già stato fatto oggi)."
    });
    try {
      await innescaWorkflow("publish-check.yml");
    } catch {
      /* non bloccante */
    }
    console.log("\n=== Direttore: giro rapido completato ===");
    return;
  }

  await eseguiPasso("Agente Vetrina (Sito)", eseguiSitoAgent);
  await eseguiPasso("Agente Lead (Cacciatore)", eseguiLeadsAgent);
  await eseguiPasso("Agente Risposte (Portavoce)", eseguiReplyAgent);
  await eseguiPasso("Agente Analytics (Analista)", eseguiAnalyticsAgent);
  await eseguiPasso("Agente Strategia (Stratega)", eseguiStrategyAgent);
  await eseguiPasso("Agente Note (Appunti)", eseguiNoteAgent);
  // L'Esploratore tiene la coda "da rivedere" sempre piena fino al numero
  // impostato nella casella "invio automatico" della pagina "Locali" — se
  // è già piena non cerca nulla di nuovo (vedi outreach-agent.ts). Il tasto
  // "Cerca nuovi locali" nella dashboard resta comunque disponibile per un
  // giro extra a comando (vedi .github/workflows/outreach-search.yml).
  await eseguiPasso("Agente Locali (Esploratore)", eseguiOutreachAgent);

  await logAgentRun({
    agente: IDENTITA.master.nome,
    identita: IDENTITA.master.ruolo,
    status: "ok",
    riepilogo: `${RIEPILOGO_CICLO_COMPLETO}: contenuto del giorno preparato, lead controllati, KPI e strategia aggiornati. La pubblicazione avverrà al prossimo controllo orario utile.`
  });

  // Innesca subito anche il controllo pubblicazione (publish-check.yml)
  // invece di aspettare solo il suo cron dedicato: i trigger "schedule" di
  // GitHub Actions arrivano spesso in ritardo di ore su repository con
  // poca attività continua (limite noto di GitHub, non risolvibile lato
  // nostro — vedi il commento in publish-check.yml). Questo ciclo gira già
  // più volte al giorno (cron proprio + ogni upload/caricamento che lo fa
  // partire prima), quindi ogni sua esecuzione è un'occasione in più
  // perché un contenuto già scaduto (data odierna o passata) esca subito
  // invece di aspettare il prossimo cron flaky. Best-effort: se fallisce,
  // il cron dedicato di publish-check.yml lo controllerà comunque.
  try {
    await innescaWorkflow("publish-check.yml");
  } catch {
    /* non bloccante */
  }

  // Il resoconto via Telegram parte solo dal vero ciclo automatico delle
  // mattutino (flag impostato da .github/workflows/daily-agents.yml), mai dai
  // lanci manuali/di test, e solo dal primo ciclo completo della giornata.
  if (process.env.MORNING_REPORT === "true" && !completoGiaFattoOggi) {
    await inviaResocontoMattutino(inizioCiclo).catch((err) => {
      console.error("[Direttore] Invio resoconto mattutino Telegram fallito:", err);
    });
  }

  console.log("\n=== Direttore: ciclo completato ===");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiMasterAgent();
}
