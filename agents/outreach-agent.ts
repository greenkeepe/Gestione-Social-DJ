// Agente "Esploratore" — ogni giorno trova fino a 10 locali (ristoranti/
// hotel) nell'area servita con un'email pubblica sul sito, e prepara una
// bozza di email di collaborazione personalizzata sul locale trovato.
//
// REGOLA FERREA, come il Cacciatore: non invia MAI nulla in autonomia.
// Ogni bozza resta "bozza-da-rivedere" finché non la spunti e invii tu
// dalla dashboard (pagina "Locali"), un tap alla volta — mai un invio
// massivo automatico: evita di far passare la tua email vera per spam e
// tiene ogni contatto sotto revisione umana, coerente con le norme sulle
// comunicazioni commerciali non richieste.
//
// Limite onesto: i dati di OpenStreetMap non includono quasi mai il nome
// di chi gestisce il locale, quindi le email si rivolgono al locale in
// generale ("Gentile team di..."), mai a una persona inventata.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readData, writeData, readBrand, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { inviaMessaggioTelegram } from "../lib/telegram.js";
import { generaTestoConLLM } from "../lib/llm.js";
import { geocodifica, cercaLocaliVicini, trovaEmailSulSito, type LocaleTrovato } from "../lib/openStreetMap.js";
import { IDENTITA } from "./identities.js";

interface ContattoLocale {
  id: string;
  osmId: string;
  nomeLocale: string;
  categoria: string;
  indirizzo: string | null;
  sitoWeb: string;
  email: string;
  oggetto: string;
  corpo: string;
  metodo: string;
  status: "bozza-da-rivedere" | "inviata" | "scartata";
  creatoIl: string;
  inviataIl: string | null;
}

interface OutreachFile {
  _istruzioni: string;
  contatti: ContattoLocale[];
}

// Serravalle Scrivia (AL): posizione approssimativa nota, usata solo se la
// geocodifica in tempo reale (Nominatim) non dovesse rispondere.
const FALLBACK_COORDINATE = { lat: 44.7166, lon: 8.8555 };

const MASSIMO_AL_GIORNO = 10;

function oggettoECorpoTemplate(nomeLocale: string, brand: Record<string, any>): { oggetto: string; corpo: string } {
  const nome = brand.nomeArte ?? "Forte DJ";
  return {
    oggetto: `Proposta di collaborazione — ${nome}`,
    corpo: `Buongiorno,

sono Andrea di ${nome}, DJ professionista per matrimoni ed eventi (${brand.anniEsperienza ?? "20"} anni di esperienza, ${brand.numeroEventiFatti ?? "200+"} eventi, oltre 75 recensioni a 5 stelle).

Mi piacerebbe presentarmi a voi di ${nomeLocale} come possibile fornitore di fiducia per i matrimoni ed eventi che ospitate: playlist su misura, impianto audio/luci/fumo completo, montaggio in meno di un'ora.

Se vi va, sarei felice di mandarvi qualche referenza o fissare un sopralluogo tecnico quando preferite.

Grazie per l'attenzione,
Andrea — ${nome}
${brand.contatti?.telefono ?? ""}`.trim()
  };
}

async function scriviEmailPersonalizzata(
  locale: LocaleTrovato,
  brand: Record<string, any>
): Promise<{ oggetto: string; corpo: string; metodo: string }> {
  const prompt = `Scrivi una breve email professionale (max 120 parole) in italiano per proporre una collaborazione, a nome di Andrea, DJ per matrimoni ed eventi (nome d'arte "${brand.nomeArte ?? ""}").
Destinatario: il locale "${locale.nome}" (${locale.categoria === "hotel" ? "hotel/location per eventi" : "ristorante"}${locale.indirizzo ? `, ${locale.indirizzo}` : ""}). Non conosci il nome di chi gestisce il locale: rivolgiti genericamente ("Gentile team di ${locale.nome}" o simile), non inventare MAI un nome di persona.
Contenuto: presentati (DJ per matrimoni/eventi, ${brand.anniEsperienza ?? "20"} anni di esperienza, ${brand.numeroEventiFatti ?? "200+"} eventi, oltre 75 recensioni 5 stelle), proponi di segnalarvi a vicenda per i rispettivi clienti che organizzano eventi, chiedi se sono disponibili a un contatto/sopralluogo.
Tono: professionale, cordiale, mai invadente. Non inventare dettagli sul locale che non conosci (menu, stile, capienza). Non usare emoji.
Rispondi ESATTAMENTE in questo formato, niente altro testo:
OGGETTO: <riga oggetto>
CORPO: <corpo della mail, con "Andrea" come firma>`;

  const risposta = await generaTestoConLLM(prompt);
  if (risposta) {
    const matchOggetto = risposta.match(/OGGETTO:\s*(.+)/i);
    const matchCorpo = risposta.match(/CORPO:\s*([\s\S]+)/i);
    if (matchOggetto && matchCorpo) {
      return { oggetto: matchOggetto[1].trim(), corpo: matchCorpo[1].trim(), metodo: "LLM" };
    }
  }
  const template = oggettoECorpoTemplate(locale.nome, brand);
  return { ...template, metodo: "template" };
}

export async function eseguiOutreachAgent(): Promise<void> {
  try {
    const brand = await readBrand<Record<string, any>>();
    const outreachFile = await readData<OutreachFile>("outreach-locali.json");
    const osmIdGiaTrattati = new Set(outreachFile.contatti.map((c) => c.osmId));

    const indirizzoBase = brand.areaServita?.base ?? "Serravalle Scrivia, Italia";
    // Il raggio dell'area servita (fino a 150km in brand.json) è troppo
    // costoso da interrogare in un colpo solo su Overpass (query lenta,
    // rischio di timeout lato server su un'area che copre più regioni):
    // per una ricerca di 10 locali al giorno un raggio più piccolo è più
    // che sufficiente, e resta comunque denso di ristoranti/hotel.
    const raggioKmConfigurato = parseInt(brand.areaServita?.raggioAzione ?? "100", 10) || 100;
    const raggioKm = Math.min(raggioKmConfigurato, 60);
    const centro = await geocodifica(indirizzoBase, FALLBACK_COORDINATE);

    let trovati: LocaleTrovato[] = [];
    try {
      trovati = await cercaLocaliVicini(centro, raggioKm * 1000);
    } catch (err) {
      await logAgentRun({
        agente: IDENTITA.outreach.nome,
        identita: IDENTITA.outreach.ruolo,
        status: "errore",
        riepilogo: "Impossibile interrogare OpenStreetMap per cercare i locali nella zona.",
        dettagli: { errore: String(err) }
      });
      return;
    }

    const candidati = trovati.filter((l) => !osmIdGiaTrattati.has(l.osmId)).sort(() => Math.random() - 0.5);

    let nuoviContatti = 0;
    for (const locale of candidati) {
      if (nuoviContatti >= MASSIMO_AL_GIORNO) break;

      const email = await trovaEmailSulSito(locale.sitoWeb).catch(() => null);
      if (!email) continue; // nessuna email trovata: si salta, mai inventata

      const { oggetto, corpo, metodo } = await scriviEmailPersonalizzata(locale, brand);

      outreachFile.contatti.unshift({
        id: randomUUID(),
        osmId: locale.osmId,
        nomeLocale: locale.nome,
        categoria: locale.categoria,
        indirizzo: locale.indirizzo,
        sitoWeb: locale.sitoWeb,
        email,
        oggetto,
        corpo,
        metodo,
        status: "bozza-da-rivedere",
        creatoIl: nowIso(),
        inviataIl: null
      });
      nuoviContatti++;
    }

    if (nuoviContatti > 0) {
      await writeData("outreach-locali.json", outreachFile);
      await inviaMessaggioTelegram(
        `📍 ${nuoviContatti} nuove bozze di email per locali della zona, pronte da rivedere e inviare con un tap dalla dashboard (pagina "Locali"). Nessun invio automatico.`
      );
    }

    await logAgentRun({
      agente: IDENTITA.outreach.nome,
      identita: IDENTITA.outreach.ruolo,
      status: nuoviContatti > 0 ? "ok" : "nessuna-azione",
      riepilogo:
        nuoviContatti > 0
          ? `Preparate ${nuoviContatti} bozze di email per locali della zona con email pubblica trovata.`
          : `Nessun nuovo locale con email trovabile tra i ${candidati.length} candidati esaminati (o nessun candidato nuovo).`
    });
  } catch (err) {
    await logAgentRun({
      agente: IDENTITA.outreach.nome,
      identita: IDENTITA.outreach.ruolo,
      status: "errore",
      riepilogo: "Errore imprevisto nell'Agente Esploratore.",
      dettagli: { errore: String(err) }
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiOutreachAgent();
}
