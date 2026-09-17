// Agente "Appunti" — propone su Telegram, ogni tanto, il testo di una
// "Nota" Instagram (il piccolo status che appare sopra i messaggi diretti,
// max 60 caratteri, visibile 24h). Le Note NON sono pubblicabili tramite
// API: Meta non espone nessun endpoint per crearle, è una funzione
// esclusiva dell'app. Questo agente quindi non pubblica MAI nulla da solo,
// propone solo un testo pronto da incollare a mano in un tap.
import "dotenv/config";
import { readData, writeData, readBrand, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { inviaMessaggioTelegram } from "../lib/telegram.js";
import { generaTestoConLLM } from "../lib/llm.js";
import { IDENTITA } from "./identities.js";

interface NoteProposteFile {
  _istruzioni: string;
  proposte: Array<{ testo: string; metodo: string; timestamp: string }>;
}

const LIMITE_CARATTERI_NOTA = 60;

// Non tutti i giorni: le Note sono pensate per sembrare spontanee, non un
// contenuto programmato. Una proposta ogni tanto, non un appuntamento fisso.
const PROBABILITA_PROPOSTA = 0.4;

const NOTE_TEMPLATE = [
  "Cuffie pronte, playlist pronta, si parte 🎧",
  "Ogni serata ha la sua canzone giusta.",
  "Oggi si balla, garantito.",
  "La console è il mio posto preferito al mondo.",
  "Prima di un evento c'è sempre quell'adrenalina bella.",
  "Non c'è niente come vedere una pista piena."
];

// Taglia in modo pulito (mai a metà parola) se il testo supera il limite:
// rete di sicurezza indipendente da cosa scrive l'LLM, che a volte sbaglia
// il conteggio nonostante l'istruzione nel prompt.
function taglia(testo: string, limite: number): string {
  const pulito = testo.trim();
  if (pulito.length <= limite) return pulito;
  const troncato = pulito.slice(0, limite);
  const ultimoSpazio = troncato.lastIndexOf(" ");
  return (ultimoSpazio > limite * 0.6 ? troncato.slice(0, ultimoSpazio) : troncato).trim();
}

export async function eseguiNoteAgent(): Promise<void> {
  try {
    if (process.env.FORCE_NOTA !== "true" && Math.random() >= PROBABILITA_PROPOSTA) {
      await logAgentRun({
        agente: IDENTITA.note.nome,
        identita: IDENTITA.note.ruolo,
        status: "nessuna-azione",
        riepilogo: "Oggi niente proposta di Nota: restano un'idea occasionale, non un appuntamento fisso."
      });
      return;
    }

    const brand = await readBrand<Record<string, any>>();
    const prompt = `Scrivi UNA sola frase brevissima (massimo ${LIMITE_CARATTERI_NOTA} caratteri, conta i caratteri con attenzione) in italiano,
in prima persona, come una "Nota" spontanea da mettere su Instagram — un pensiero al volo scritto da un DJ per matrimoni/eventi
(${brand.nomeArte ?? ""}), NON una didascalia di un post. Tema libero legato alla vita da DJ: un pensiero prima di un evento,
la musica, l'energia di una serata, la console. Tono: ${brand.toneOfVoice?.descrizione ?? "caldo, diretto, mai costruito"}.
Non scrivere hashtag, non scrivere virgolette, nessuna call to action, nessun invito a scrivere in DM. Scrivi SOLO la frase, niente altro.`;

    const testoLLM = await generaTestoConLLM(prompt);
    const metodo = testoLLM ? "LLM" : "template";
    const testoGrezzo = testoLLM?.trim() || NOTE_TEMPLATE[Math.floor(Math.random() * NOTE_TEMPLATE.length)];
    const testo = taglia(testoGrezzo, LIMITE_CARATTERI_NOTA);

    const proposteFile = await readData<NoteProposteFile>("note-proposte.json");
    proposteFile.proposte.unshift({ testo, metodo, timestamp: nowIso() });
    if (proposteFile.proposte.length > 100) {
      proposteFile.proposte = proposteFile.proposte.slice(0, 100);
    }
    await writeData("note-proposte.json", proposteFile);

    await inviaMessaggioTelegram(
      `💭 Proposta di Nota per Instagram (${testo.length}/${LIMITE_CARATTERI_NOTA} caratteri) — nessuna pubblicazione automatica, le Note si possono creare solo dall'app: copiala tu quando vuoi.\n\n"${testo}"`
    );

    await logAgentRun({
      agente: IDENTITA.note.nome,
      identita: IDENTITA.note.ruolo,
      status: "ok",
      riepilogo: `Proposta una Nota su Telegram (${metodo}): "${testo}"`
    });
  } catch (err) {
    await logAgentRun({
      agente: IDENTITA.note.nome,
      identita: IDENTITA.note.ruolo,
      status: "errore",
      riepilogo: "Errore imprevisto nell'Agente Appunti.",
      dettagli: { errore: String(err) }
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiNoteAgent();
}
