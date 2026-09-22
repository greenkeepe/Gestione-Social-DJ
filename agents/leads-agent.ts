// Agente "Cacciatore" — legge i commenti sugli ultimi contenuti pubblicati
// (interazioni IN ENTRATA da persone che hanno già scritto qualcosa) e
// prepara bozze di messaggi personalizzati per te.
//
// REGOLA FERREA: questo agente non invia MAI nulla in autonomia e non
// contatta MAI sconosciuti che non hanno prima interagito con un contenuto.
// Ogni bozza resta con status "bozza-da-rivedere" finché non la spunti e
// invii tu stesso da telefono. Questo evita violazioni delle policy Meta
// sui messaggi non richiesti e problemi di privacy/spam verso privati.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readData, writeData, readBrand, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { inviaMessaggioTelegram } from "../lib/telegram.js";
import { leggiUltimiMediaInstagram, leggiCommentiRecenti, leggiUsernameAccountInstagram } from "../lib/metaGraph.js";
import { generaTestoConLLM } from "../lib/llm.js";
import { IDENTITA } from "./identities.js";

interface LeadsFile {
  _istruzioni: string;
  leads: Array<{
    id: string;
    username: string;
    fonte: string;
    commentoOriginale: string;
    messaggioProposto: string;
    status: string;
    creatoIl: string;
  }>;
}

const PAROLE_CHIAVE_INTERESSE = [
  "matrimonio", "sposi", "sposa", "sposo", "wedding", "info", "prezzo", "prezzi",
  "disponibilità", "disponibilita", "contatt", "quanto costa", "quanto costi", "costa",
  "data", "evento", "feste", "festa", "compleanno", "diciottesimo", "battesimo",
  "comunione", "cerimonia", "location", "quanto viene", "preventivo", "budget",
  "quando sei libero", "sei libero", "disponibile", "come funziona", "ricevimento"
];

function sembraUnLeadInteressato(testo: string): boolean {
  const t = testo.toLowerCase();
  return PAROLE_CHIAVE_INTERESSE.some((k) => t.includes(k));
}

export async function eseguiLeadsAgent(): Promise<void> {
  try {
    const leadsFile = await readData<LeadsFile>("leads.json");
    const usernameGiaContattati = new Set(leadsFile.leads.map((l) => l.username));

    let media: Awaited<ReturnType<typeof leggiUltimiMediaInstagram>> = [];
    try {
      media = await leggiUltimiMediaInstagram(15);
    } catch (err) {
      await logAgentRun({
        agente: IDENTITA.leads.nome,
        identita: IDENTITA.leads.ruolo,
        status: "errore",
        riepilogo: "Impossibile leggere i media recenti da Instagram. Controlla i token Meta.",
        dettagli: { errore: String(err) }
      });
      await inviaMessaggioTelegram(`⚠️ ${IDENTITA.leads.nome}: Impossibile leggere i media recenti da Instagram. Controlla i token Meta.\n${String(err)}`);
      return;
    }

    const brand = await readBrand<Record<string, any>>();
    const nostroUsername = await leggiUsernameAccountInstagram().catch(() => null);
    let nuoviLead = 0;

    for (const m of media) {
      const commenti = await leggiCommentiRecenti(m.id).catch(() => []);
      for (const c of commenti) {
        if (nostroUsername && c.username === nostroUsername) continue; // ignora i nostri stessi commenti (es. hashtag aggiuntivi)
        if (usernameGiaContattati.has(c.username)) continue;
        if (!sembraUnLeadInteressato(c.text)) continue;

        const promptMsg = `Scrivi un breve messaggio privato (max 50 parole) in italiano, cordiale e non invadente,
da mandare su Instagram a @${c.username} che ha scritto questo commento: "${c.text}"
sotto un post del DJ per matrimoni "${brand.nomeArte ?? ""}". Ringrazialo/a per l'interesse, rispondi
brevemente se pertinente, e invita a scrivere in DM per maggiori informazioni su date/servizi. Non inventare prezzi o disponibilità specifiche.`;

        const messaggioLLM = await generaTestoConLLM(promptMsg);
        const messaggioTemplate = `Ciao! Grazie per il tuo messaggio 😊 Se vuoi saperne di più sui servizi per il tuo matrimonio scrivimi pure qui in DM, ti rispondo con tutti i dettagli e la disponibilità!`;

        leadsFile.leads.push({
          id: randomUUID(),
          username: c.username,
          fonte: `commento su post ${m.id}`,
          commentoOriginale: c.text,
          messaggioProposto: messaggioLLM ?? messaggioTemplate,
          status: "bozza-da-rivedere",
          creatoIl: nowIso()
        });
        usernameGiaContattati.add(c.username);
        nuoviLead++;
      }
    }

    if (nuoviLead > 0) {
      await writeData("leads.json", leadsFile);
    }

    const riepilogo = nuoviLead > 0
      ? `Trovati ${nuoviLead} nuovi lead da chi ha commentato con interesse. Bozze pronte da rivedere nella dashboard.`
      : "Nessun nuovo commento con segnali di interesse da quando ho controllato l'ultima volta.";
    await logAgentRun({
      agente: IDENTITA.leads.nome,
      identita: IDENTITA.leads.ruolo,
      status: nuoviLead > 0 ? "ok" : "nessuna-azione",
      riepilogo
    });
    if (nuoviLead > 0) {
      await inviaMessaggioTelegram(`✅ ${IDENTITA.leads.nome}: ${riepilogo}`);
    }
  } catch (err) {
    await logAgentRun({
      agente: IDENTITA.leads.nome,
      identita: IDENTITA.leads.ruolo,
      status: "errore",
      riepilogo: "Errore imprevisto nell'Agente Lead.",
      dettagli: { errore: String(err) }
    });
    await inviaMessaggioTelegram(`⚠️ ${IDENTITA.leads.nome}: Errore imprevisto nell'Agente Lead.\n${String(err)}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiLeadsAgent();
}
