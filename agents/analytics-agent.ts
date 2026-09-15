// Agente "Analista" — legge le metriche da Meta e aggiorna i KPI usati
// dalla dashboard e dallo Stratega.
import "dotenv/config";
import { readData, writeData, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { leggiInsightsAccountInstagram } from "../lib/metaGraph.js";
import { IDENTITA } from "./identities.js";

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
      riepilogo: `KPI aggiornati: ${kpis.instagram.followers ?? "n/d"} follower Instagram, ${kpis.obiettivo2027.leadAttivi} lead attivi.`
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
