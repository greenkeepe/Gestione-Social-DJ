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
import { readData, writeData, readBrand } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { leggiUltimiMediaInstagram, leggiCommentiRecenti, leggiUsernameAccountInstagram, rispondiCommento } from "../lib/metaGraph.js";
import { generaTestoConLLM } from "../lib/llm.js";
import { IDENTITA } from "./identities.js";

interface RispostiFile {
  _istruzioni: string;
  idCommentiRisposti: string[];
}

const RISPOSTE_TEMPLATE = [
  "Grazie mille! 🙏",
  "Grazie per il supporto! ❤️",
  "Grazie a te per il commento! 🎧",
  "Grazie mille, apprezzo tantissimo! 🙌"
];

// Tiene il file da crescere all'infinito: bastano le ultime risposte per
// evitare doppioni, un commento più vecchio di così non torna mai più tra
// gli "ultimi post" letti a ogni ciclo.
const MASSIMO_STORICO = 500;

export async function eseguiReplyAgent(): Promise<void> {
  try {
    const rispostiFile = await readData<RispostiFile>("comment-replies.json");
    const giaRisposti = new Set(rispostiFile.idCommentiRisposti);

    let media: Awaited<ReturnType<typeof leggiUltimiMediaInstagram>> = [];
    try {
      media = await leggiUltimiMediaInstagram(10);
    } catch (err) {
      await logAgentRun({
        agente: IDENTITA.reply.nome,
        identita: IDENTITA.reply.ruolo,
        status: "errore",
        riepilogo: "Impossibile leggere i media recenti da Instagram. Controlla i token Meta.",
        dettagli: { errore: String(err) }
      });
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
          rispostiFile.idCommentiRisposti.push(c.id);
          nuoveRisposte++;
        } catch (err) {
          console.error(`[Portavoce] Risposta al commento ${c.id} fallita:`, err);
        }
      }
    }

    if (rispostiFile.idCommentiRisposti.length > MASSIMO_STORICO) {
      rispostiFile.idCommentiRisposti = rispostiFile.idCommentiRisposti.slice(-MASSIMO_STORICO);
    }

    if (nuoveRisposte > 0) {
      await writeData("comment-replies.json", rispostiFile);
    }

    await logAgentRun({
      agente: IDENTITA.reply.nome,
      identita: IDENTITA.reply.ruolo,
      status: nuoveRisposte > 0 ? "ok" : "nessuna-azione",
      riepilogo:
        nuoveRisposte > 0
          ? `Risposto pubblicamente a ${nuoveRisposte} nuovi commenti sugli ultimi post.`
          : "Nessun nuovo commento a cui rispondere da quando ho controllato l'ultima volta."
    });
  } catch (err) {
    await logAgentRun({
      agente: IDENTITA.reply.nome,
      identita: IDENTITA.reply.ruolo,
      status: "errore",
      riepilogo: "Errore imprevisto nell'Agente Portavoce.",
      dettagli: { errore: String(err) }
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiReplyAgent();
}
