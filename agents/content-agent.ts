// Agente "Copy" — scrive didascalia e hashtag per il contenuto in coda,
// seguendo il pilastro editoriale del giorno (data/content-calendar.json)
// e il tone of voice del brand (config/brand.json). Se ANTHROPIC_API_KEY è
// impostata, usa l'LLM per rendere il testo più naturale; altrimenti usa
// un template scritto a mano (zero costo, sempre funzionante).
import "dotenv/config";
import { readData, writeData, readBrand } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { generaTestoConLLM } from "../lib/llm.js";
import { IDENTITA } from "./identities.js";
import { scegliOrarioDelGiorno } from "../lib/bestTime.js";

interface PostsQueueFile {
  _istruzioni: string;
  queue: Array<{ id: string; formato: string; status: string; caption: string | null; hashtags: string[]; orarioProgrammato: string | null; pillarId?: string }>;
}

interface CalendarFile {
  pillars: Array<{ id: string; nome: string; descrizione: string; formatoConsigliato: string[] }>;
  settimanaTipo: Record<string, string>;
}

const GIORNI = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];

function pilastroDelGiorno(calendar: CalendarFile): CalendarFile["pillars"][number] {
  const nomeGiorno = GIORNI[new Date().getDay()];
  const idPreferito = calendar.settimanaTipo[nomeGiorno];
  return calendar.pillars.find((p) => p.id === idPreferito) ?? calendar.pillars[Math.floor(Math.random() * calendar.pillars.length)];
}

function templateBase(brand: Record<string, any>, pilastro: CalendarFile["pillars"][number]): string {
  const nome = brand.nomeArte ?? "il tuo DJ";
  const tagline = brand.tagline ?? "";
  const hashtagFissi: string[] = brand.toneOfVoice?.hashtagFissi ?? [];

  const varianti: Record<string, string> = {
    "dietro-le-quinte": `Preparazione, check audio, tanta cura nei dettagli prima che inizi la festa 🎧✨\n${tagline}`,
    "momenti-forti": `Questo è il momento in cui la pista esplode 🔥 Emozioni così non si dimenticano.\n${tagline}`,
    location: `Ogni location ha la sua atmosfera: qui l'abbiamo trasformata in una vera festa 🎶`,
    testimonianze: `Le parole più belle sono quelle di chi c'era. Grazie di cuore ❤️`,
    consigli: `Un consiglio per chi sta organizzando il matrimonio: la scelta della musica giusta cambia tutta la serata. Scrivimi se vuoi parlarne insieme!`,
    playlist: `Un piccolo assaggio di quello che potrebbe suonare al vostro matrimonio 🎵`,
    "call-to-action": `Le date per il 2027 stanno iniziando a riempirsi: se state pensando al matrimonio dei vostri sogni, scriviamoci! 💍`
  };

  const corpo = varianti[pilastro.id] ?? `${nome} — ${pilastro.descrizione}`;
  return `${corpo}\n\n${hashtagFissi.join(" ")}`.trim();
}

export async function eseguiContentAgent(): Promise<void> {
  try {
    const queueFile = await readData<PostsQueueFile>("posts-queue.json");
    const target = queueFile.queue.find((p) => p.status === "in-coda-caption");

    if (!target) {
      await logAgentRun({
        agente: IDENTITA.content.nome,
        identita: IDENTITA.content.ruolo,
        status: "nessuna-azione",
        riepilogo: "Nessun contenuto in attesa di didascalia oggi."
      });
      return;
    }

    const brand = await readBrand<Record<string, any>>();
    const calendar = await readData<CalendarFile>("content-calendar.json");
    const pilastro = pilastroDelGiorno(calendar);

    let caption: string;
    const prompt = `Scrivi una didascalia Instagram in italiano per un DJ per matrimoni ed eventi.
Brand: ${JSON.stringify(brand)}
Tema del giorno: ${pilastro.nome} - ${pilastro.descrizione}
Tono: ${brand.toneOfVoice?.descrizione ?? "professionale e caloroso"}.
Massimo 60 parole, includi 2-3 emoji pertinenti se il brand le consente, NON inventare dettagli falsi (numeri, nomi di sposi) che non sono nel brand. Finisci con una breve call to action naturale. Non usare hashtag nel corpo, li aggiungo io dopo.`;

    const testoLLM = await generaTestoConLLM(prompt);
    caption = testoLLM ?? templateBase(brand, pilastro);

    const hashtagFissi: string[] = brand.toneOfVoice?.hashtagFissi ?? [];
    if (testoLLM) {
      caption = `${testoLLM}\n\n${hashtagFissi.join(" ")}`.trim();
    }

    target.caption = caption;
    target.hashtags = hashtagFissi;
    target.pillarId = pilastro.id;
    target.orarioProgrammato = scegliOrarioDelGiorno(new Date().getDay()).ora;
    target.status = "pronto";

    await writeData("posts-queue.json", queueFile);

    await logAgentRun({
      agente: IDENTITA.content.nome,
      identita: IDENTITA.content.ruolo,
      status: "ok",
      riepilogo: `Scritta didascalia per il contenuto "${pilastro.nome}" (${testoLLM ? "generata con LLM" : "template"}). Programmato per le ${target.orarioProgrammato}.`
    });
  } catch (err) {
    await logAgentRun({
      agente: IDENTITA.content.nome,
      identita: IDENTITA.content.ruolo,
      status: "errore",
      riepilogo: "Errore imprevisto nell'Agente Contenuti.",
      dettagli: { errore: String(err) }
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiContentAgent();
}
