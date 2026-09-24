// Propone titolo/meta description alternativi per le pagine con
// un'opportunità SEO rilevata (vedi detect-opportunities.ts): Claude legge
// il testo attuale + la query che non converte abbastanza e suggerisce
// un'alternativa, basata solo su cosa c'è davvero nella pagina — MAI
// applicata in automatico. Resta una "proposta" in
// data/seo/seo-proposte.json finché Andrea non la approva (o modifica e
// approva, o scarta) dalla pagina "SEO" della dashboard privata, che scrive
// direttamente in messages/it.json via GitHub Contents API.
//
// Senza ANTHROPIC_API_KEY il resto dell'SEO Engine funziona comunque (solo
// niente proposte): stesso principio "zero costo di base" del resto del
// repository.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { siteRoutes } from "../../data/routes";
import type { OpportunitiesFile, SeoOpportunity, SeoProposal, SeoProposalsFile } from "../../lib/seoEngineTypes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data/seo");
const OPPORTUNITIES_FILE = path.join(DATA_DIR, "opportunities.json");
const PROPOSALS_FILE = path.join(DATA_DIR, "seo-proposte.json");
const MESSAGES_IT_FILE = path.resolve(__dirname, "../../messages/it.json");

async function leggiJson<T>(file: string, valoreDiDefault: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf-8")) as T;
  } catch {
    return valoreDiDefault;
  }
}

async function chiediAdAnthropic(prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!res.ok) {
    console.error("[seo-propose] chiamata Anthropic fallita:", res.status, await res.text());
    return null;
  }
  const json = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  return json.content.find((c) => c.type === "text")?.text?.trim() ?? null;
}

async function inviaMessaggioTelegram(testo: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!token || !chatId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: testo })
    });
    if (!res.ok) console.error("[seo-propose] invio notifica Telegram fallito:", res.status, await res.text());
  } catch (err) {
    console.error("[seo-propose] invio notifica Telegram fallito:", err);
  }
}

function costruisciPrompt(
  route: (typeof siteRoutes)[number],
  opp: SeoOpportunity,
  titleAttuale: string,
  descriptionAttuale: string | null
): string {
  return `Sei un copywriter SEO per il sito di un DJ per matrimoni ed eventi (Forte DJ, attivo in Piemonte, Liguria e Lombardia).

La pagina "${route.label}" (${route.path || "/"}) compare su Google per la query "${opp.query}" in posizione media ${opp.position.toFixed(1)} con ${opp.impressions} impression negli ultimi 28 giorni, ma un CTR basso (${(opp.ctr * 100).toFixed(1)}%): chi la vede nei risultati di ricerca probabilmente non è abbastanza invogliato a cliccare.

Titolo attuale (tag <title>, max ~60 caratteri prima di essere troncato da Google): "${titleAttuale}"
${descriptionAttuale ? `Meta description attuale (max ~155 caratteri): "${descriptionAttuale}"` : ""}

Scrivi un titolo alternativo che includa in modo naturale il tema della query "${opp.query}" (mai ripetuto meccanicamente, niente keyword-stuffing) e sia più invitante al clic — restando sempre vero e coerente con quello che la pagina offre davvero, mai una promessa che il sito non mantiene.
${descriptionAttuale ? "Scrivi anche una meta description alternativa, stesso principio: chiara, concreta, che dia una ragione per cliccare." : ""}

Rispondi SOLO con un JSON valido, senza testo prima o dopo, in questo formato esatto:
{"title": "...."${descriptionAttuale ? ', "description": "...."' : ""}}
Titolo entro 60 caratteri${descriptionAttuale ? ", description entro 155 caratteri" : ""}. Testo in italiano.`;
}

function estraiJson(testo: string): { title?: string; description?: string } | null {
  const match = testo.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("[seo-propose] ANTHROPIC_API_KEY non impostata: nessuna proposta generata (il resto dell'SEO Engine funziona comunque).");
    return;
  }

  const opportunitiesFile = await leggiJson<OpportunitiesFile>(OPPORTUNITIES_FILE, {
    generatedAt: null,
    sourceGeneratedAt: null,
    period: null,
    rules: { positionRange: [5, 20], minImpressions: 30, lowCtrThreshold: 0.03, highImpressionsThreshold: 300, mediumImpressionsThreshold: 100 },
    opportunities: []
  });
  const proposalsFile = await leggiJson<SeoProposalsFile>(PROPOSALS_FILE, { proposte: [] });
  const messagesIt = JSON.parse(await readFile(MESSAGES_IT_FILE, "utf-8")) as Record<string, Record<string, string>>;

  // Una pagina può avere più query segnalate: si prende quella con più
  // impression come rappresentativa, una sola proposta per pagina alla
  // volta (non tante proposte in conflitto sulla stessa pagina).
  const migliorePerPagina = new Map<string, SeoOpportunity>();
  for (const opp of opportunitiesFile.opportunities) {
    if (!opp.pageExists) continue; // pagina non mappata in data/routes.ts (es. url con prefisso lingua non gestito): non tocchiamo alla cieca
    const esistente = migliorePerPagina.get(opp.page);
    if (!esistente || opp.impressions > esistente.impressions) migliorePerPagina.set(opp.page, opp);
  }

  const nuoveProposte: SeoProposal[] = [];
  for (const [pagePath, opp] of migliorePerPagina) {
    // Già una proposta attiva (in attesa o già applicata) per questa
    // pagina: non se ne genera una seconda finché quella non viene scartata.
    const giaPresente = proposalsFile.proposte.some((p) => p.page === pagePath && p.status !== "scartata");
    if (giaPresente) continue;

    const route = siteRoutes.find((r) => (r.path || "/") === pagePath);
    if (!route) continue;

    const namespace = messagesIt[route.metaNamespace] ?? {};
    const titleAttuale = namespace[route.metaTitleKey];
    const descriptionAttuale = route.metaDescriptionKey ? (namespace[route.metaDescriptionKey] ?? null) : null;
    if (!titleAttuale) continue;

    const prompt = costruisciPrompt(route, opp, titleAttuale, descriptionAttuale);
    const rispostaGrezza = await chiediAdAnthropic(prompt);
    if (!rispostaGrezza) continue;

    const parsed = estraiJson(rispostaGrezza);
    if (!parsed?.title) {
      console.error(`[seo-propose] risposta non valida per ${pagePath}, salto:`, rispostaGrezza);
      continue;
    }

    nuoveProposte.push({
      id: randomUUID(),
      page: pagePath,
      pageLabel: route.label,
      query: opp.query,
      priority: opp.priority,
      reason: opp.reason,
      metaNamespace: route.metaNamespace,
      metaTitleKey: route.metaTitleKey,
      metaDescriptionKey: route.metaDescriptionKey,
      titleAttuale,
      titleProposto: parsed.title.trim(),
      descriptionAttuale,
      descriptionProposta: route.metaDescriptionKey ? (parsed.description?.trim() ?? null) : null,
      status: "proposta",
      creatoIl: new Date().toISOString(),
      decisoIl: null
    });
  }

  if (nuoveProposte.length > 0) {
    proposalsFile.proposte.unshift(...nuoveProposte);
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(PROPOSALS_FILE, JSON.stringify(proposalsFile, null, 2) + "\n", "utf-8");

    const elenco = nuoveProposte.map((p) => `• ${p.pageLabel} (query "${p.query}", priorità ${p.priority})`).join("\n");
    await inviaMessaggioTelegram(
      `🔍 SEO Engine: ${nuoveProposte.length} nuova/e proposta/e di titolo/meta pronte da rivedere in dashboard → pagina "SEO":\n${elenco}`
    );
  }

  console.log(`[seo-propose] ${nuoveProposte.length} nuove proposte generate, salvate in ${PROPOSALS_FILE}`);
}

main().catch((err) => {
  console.error("[seo-propose] Errore:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
