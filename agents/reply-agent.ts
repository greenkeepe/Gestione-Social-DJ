// Agente "Portavoce" — risponde pubblicamente, in fretta, ai commenti nuovi
// sugli ultimi post pubblicati. Rispondere SOTTO al post (diverso dal
// Cacciatore, che scrive messaggi PRIVATI solo a chi sembra un lead vero)
// è un segnale di conversazione attiva che l'algoritmo di Instagram usa per
// decidere quanto mostrare un post anche a chi non segue ancora l'account.
//
// REGOLA FERREA: risponde SEMPRE e SOLO in pubblico, sotto al commento
// stesso. Mai un messaggio privato, mai un prezzo o una disponibilità
// specifica (quelli restano al Cacciatore/a te) — solo cordialità breve.
import "dotenv/config";
import { readData, writeData, readBrand, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { inviaMessaggioTelegram } from "../lib/telegram.js";
import { leggiUltimiMediaInstagram, leggiCommentiRecenti, leggiUsernameAccountInstagram, rispondiCommento } from "../lib/metaGraph.js";
import { generaTestoConLLM } from "../lib/llm.js";
import { IDENTITA } from "./identities.js";

interface RispostaCommento {
  commentId: string;
  mediaId: string;
  permalink: string | null;
  username: string;
  commentoOriginale: string;
  risposta: string;
  timestamp: string;
}

interface RispostiFile {
  _istruzioni: string;
  risposte: RispostaCommento[];
  // Risposte pubblicate prima che questo file registrasse i dettagli
  // completi: restano qui solo per non rispondere due volte agli stessi
  // commenti, non compaiono nella dashboard (nessun testo salvato).
  idCommentiRispostiLegacy?: string[];
}

const RISPOSTE_TEMPLATE = [
  "Grazie mille! 🙏",
  "Grazie per il supporto! ❤️",
  "Grazie a te per il commento! 🎧",
  "Grazie mille, apprezzo tantissimo! 🙌"
];

// Tiene il file da crescere all'infinito: bastano le ultime risposte per
// evitare doppioni e per la dashboard, un commento più vecchio di così non
// torna mai più tra gli "ultimi post" letti a ogni ciclo.
const MASSIMO_STORICO = 500;

export async function eseguiReplyAgent(): Promise<void> {
  try {
    const rispostiFile = await readData<RispostiFile>("comment-replies.json");
    const giaRisposti = new Set([
      ...rispostiFile.risposte.map((r) => r.commentId),
      ...(rispostiFile.idCommentiRispostiLegacy ?? [])
    ]);

    // Non solo gli ultimissimi post: controlla più indietro nello storico, così
    // trova ed evade anche i commenti rimasti indietro su post meno recenti
    // (es. la prima volta che gira, o dopo un periodo senza commenti nuovi).
    let media: Awaited<ReturnType<typeof leggiUltimiMediaInstagram>> = [];
    try {
      media = await leggiUltimiMediaInstagram(30);
    } catch (err) {
      await logAgentRun({
        agente: IDENTITA.reply.nome,
        identita: IDENTITA.reply.ruolo,
        status: "errore",
        riepilogo: "Impossibile leggere i media recenti da Instagram. Controlla i token Meta.",
        dettagli: { errore: String(err) }
      });
      await inviaMessaggioTelegram(`⚠️ ${IDENTITA.reply.nome}: Impossibile leggere i media recenti da Instagram. Controlla i token Meta.\n${String(err)}`);
      return;
    }

    const brand = await readBrand<Record<string, any>>();
    const nostroUsername = await leggiUsernameAccountInstagram().catch(() => null);
    let nuoveRisposte = 0;

    for (const m of media) {
      const commenti = await leggiCommentiRecenti(m.id).catch(() => []);
      for (const c of commenti) {
        if (nostroUsername && c.username === nostroUsername) continue; // mai rispondere ai propri stessi commenti
        if (giaRisposti.has(c.id)) continue;

        const promptRisposta = `Scrivi una brevissima risposta pubblica (max 15 parole) in italiano a questo commento
sotto un post di un DJ per matrimoni: "${c.text}" (di @${c.username}).
Tono cordiale e genuino, come risponderebbe di persona il DJ (${brand.nomeArte ?? ""}). Non promettere mai prezzi o
disponibilità specifiche, non invitare a scrivere altrove: è solo un grazie/risposta breve sotto al post stesso.`;
        const rispostaLLM = await generaTestoConLLM(promptRisposta);
        const testo = rispostaLLM?.trim() || RISPOSTE_TEMPLATE[Math.floor(Math.random() * RISPOSTE_TEMPLATE.length)];

        try {
          await rispondiCommento(c.id, testo);
          rispostiFile.risposte.unshift({
            commentId: c.id,
            mediaId: m.id,
            permalink: m.permalink ?? null,
            username: c.username,
            commentoOriginale: c.text,
            risposta: testo,
            timestamp: nowIso()
          });
          nuoveRisposte++;
        } catch (err) {
          console.error(`[Portavoce] Risposta al commento ${c.id} fallita:`, err);
        }
      }
    }

    if (rispostiFile.risposte.length > MASSIMO_STORICO) {
      rispostiFile.risposte = rispostiFile.risposte.slice(0, MASSIMO_STORICO);
    }

    if (nuoveRisposte > 0) {
      await writeData("comment-replies.json", rispostiFile);
    }

    const riepilogo =
      nuoveRisposte > 0
        ? `Risposto pubblicamente a ${nuoveRisposte} nuovi commenti sugli ultimi post.`
        : "Nessun nuovo commento a cui rispondere da quando ho controllato l'ultima volta.";
    await logAgentRun({
      agente: IDENTITA.reply.nome,
      identita: IDENTITA.reply.ruolo,
      status: nuoveRisposte > 0 ? "ok" : "nessuna-azione",
      riepilogo
    });
    if (nuoveRisposte > 0) {
      await inviaMessaggioTelegram(`✅ ${IDENTITA.reply.nome}: ${riepilogo}`);
    }
  } catch (err) {
    await logAgentRun({
      agente: IDENTITA.reply.nome,
      identita: IDENTITA.reply.ruolo,
      status: "errore",
      riepilogo: "Errore imprevisto nell'Agente Portavoce.",
      dettagli: { errore: String(err) }
    });
    await inviaMessaggioTelegram(`⚠️ ${IDENTITA.reply.nome}: Errore imprevisto nell'Agente Portavoce.\n${String(err)}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiReplyAgent();
}
