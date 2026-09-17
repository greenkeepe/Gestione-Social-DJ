// Agente "Analista" — legge le metriche da Meta e aggiorna i KPI usati
// dalla dashboard e dallo Stratega.
import "dotenv/config";
import { readData, writeData, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { leggiInsightsAccountInstagram, leggiInsightsPost } from "../lib/metaGraph.js";
import { misuraUsoR2 } from "../lib/r2Usage.js";
import { inviaMessaggioTelegram } from "../lib/telegram.js";
import { calcolaPunteggio } from "../lib/performanceLearning.js";
import { IDENTITA } from "./identities.js";

interface ServiceLimitsFile {
  _istruzioni: string;
  servizi: {
    r2: {
      nome: string;
      limiteBytes: number;
      sogliaPercentualePausa: number;
      usoAttualeBytes: number;
      oggettiAttuali: number;
      aggiornatoIl: string | null;
      pausatoIl: string | null;
    };
  };
}

// Misura lo spazio reale occupato su Cloudflare R2 e mette in pausa
// automaticamente il caricamento di nuovi media se si supera la soglia
// impostata: separato dal resto del ciclo (try/catch proprio) così un
// eventuale problema con i token Meta non impedisce mai questo controllo.
async function aggiornaUsoR2(): Promise<void> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) return; // R2 non configurato: niente da misurare

  const limiti = await readData<ServiceLimitsFile>("service-limits.json");
  const r2 = limiti.servizi.r2;
  const eraGiaPausato = r2.pausatoIl !== null;

  const uso = await misuraUsoR2({ accountId, accessKeyId, secretAccessKey, bucketName });
  r2.usoAttualeBytes = uso.bytes;
  r2.oggettiAttuali = uso.oggetti;
  r2.aggiornatoIl = nowIso();

  const percentuale = (uso.bytes / r2.limiteBytes) * 100;
  const superaSoglia = percentuale >= r2.sogliaPercentualePausa;

  if (superaSoglia && !eraGiaPausato) {
    r2.pausatoIl = nowIso();
    await inviaMessaggioTelegram(
      `⚠️ Spazio R2 al ${percentuale.toFixed(0)}% (soglia ${r2.sogliaPercentualePausa}%): ho messo in pausa il caricamento di nuovi media da Telegram/dashboard finché non liberi spazio o alzi la soglia dalla pagina "Utilizzo servizi".`
    );
  } else if (!superaSoglia && eraGiaPausato) {
    r2.pausatoIl = null; // spazio liberato sotto soglia: riprende da solo
    await inviaMessaggioTelegram(`✅ Spazio R2 tornato sotto soglia (${percentuale.toFixed(0)}%): il caricamento di nuovi media è di nuovo attivo.`);
  }

  await writeData("service-limits.json", limiti);
}

interface PublishedLogEntry {
  timestamp: string;
  instagramId: string | null;
  punteggio?: number | null;
}

interface PublishedLogFile {
  _istruzioni: string;
  log: PublishedLogEntry[];
}

// Misura il punteggio reale (like, commenti, salvataggi, condivisioni
// pesati — vedi lib/performanceLearning.ts) dei post pubblicati da almeno 2
// giorni (tempo perché le metriche si stabilizzino) e non ancora misurati.
// Alimenta il Content Agent, che lo usa per imparare quali pilastri
// editoriali e hashtag portano più interazione reale (vedi content-agent.ts
// > pilastroDelGiorno/costruisciHashtag). Separato dal resto del ciclo (try/
// catch proprio): un problema qui non deve mai bloccare la misura di R2 o
// dei follower.
async function aggiornaPunteggiPubblicati(): Promise<number> {
  const logFile = await readData<PublishedLogFile>("published-log.json");
  const dueGiorniFa = Date.now() - 2 * 24 * 60 * 60 * 1000;
  let misurati = 0;

  for (const voce of logFile.log) {
    if (!voce.instagramId || voce.punteggio != null) continue;
    if (new Date(voce.timestamp).getTime() > dueGiorniFa) continue;

    try {
      const insights = await leggiInsightsPost(voce.instagramId);
      const dati = (insights as { data?: Array<{ name: string; values?: Array<{ value: number }> }> }).data ?? [];
      const mappa = Object.fromEntries(dati.map((m) => [m.name, m.values?.[0]?.value ?? 0]));
      voce.punteggio = calcolaPunteggio({
        likes: mappa.likes,
        comments: mappa.comments,
        saved: mappa.saved,
        shares: mappa.shares,
        impressions: mappa.impressions,
        reach: mappa.reach
      });
      misurati++;
    } catch (err) {
      console.error(`[Analista] Impossibile leggere gli insights del post ${voce.instagramId}:`, err);
    }
  }

  if (misurati > 0) await writeData("published-log.json", logFile);
  return misurati;
}

interface KpisFile {
  ultimoAggiornamento: string | null;
  instagram: { followers: number | null; followersTrend7g: number | null; reachMedio30g: number | null; engagementRateMedio30g: number | null };
  facebook: { followers: number | null; reachMedio30g: number | null };
  obiettivo2027: { matrimoniTarget: number; matrimoniConfermati: number; matrimoniInTrattativa: number; leadAttivi: number };
}

interface LeadsFile {
  leads: Array<{ status: string }>;
}

export async function eseguiAnalyticsAgent(): Promise<void> {
  await aggiornaUsoR2().catch((err) => console.error("[Analista] Misura uso R2 fallita:", err));
  const punteggiMisurati = await aggiornaPunteggiPubblicati().catch((err) => {
    console.error("[Analista] Misura punteggi post pubblicati fallita:", err);
    return 0;
  });

  try {
    const kpis = await readData<KpisFile>("kpis.json");
    const followersPrecedenti = kpis.instagram.followers;

    let insights: { followers_count?: number; media_count?: number };
    try {
      insights = await leggiInsightsAccountInstagram();
    } catch (err) {
      await logAgentRun({
        agente: IDENTITA.analytics.nome,
        identita: IDENTITA.analytics.ruolo,
        status: "errore",
        riepilogo: "Impossibile leggere gli Insights Instagram. Controlla i token Meta.",
        dettagli: { errore: String(err) }
      });
      return;
    }

    kpis.instagram.followers = insights.followers_count ?? kpis.instagram.followers;
    kpis.instagram.followersTrend7g =
      followersPrecedenti != null && insights.followers_count != null
        ? insights.followers_count - followersPrecedenti
        : kpis.instagram.followersTrend7g;

    const leadsFile = await readData<LeadsFile>("leads.json");
    kpis.obiettivo2027.leadAttivi = leadsFile.leads.filter((l) => l.status !== "archiviato").length;
    kpis.ultimoAggiornamento = nowIso();

    await writeData("kpis.json", kpis);

    await logAgentRun({
      agente: IDENTITA.analytics.nome,
      identita: IDENTITA.analytics.ruolo,
      status: "ok",
      riepilogo: `KPI aggiornati: ${kpis.instagram.followers ?? "n/d"} follower Instagram, ${kpis.obiettivo2027.leadAttivi} lead attivi.${punteggiMisurati > 0 ? ` Misurato il punteggio di ${punteggiMisurati} post pubblicati.` : ""}`
    });
  } catch (err) {
    await logAgentRun({
      agente: IDENTITA.analytics.nome,
      identita: IDENTITA.analytics.ruolo,
      status: "errore",
      riepilogo: "Errore imprevisto nell'Agente Analytics.",
      dettagli: { errore: String(err) }
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiAnalyticsAgent();
}
