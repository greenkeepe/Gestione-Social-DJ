// Agente "Esploratore" — ogni giorno trova fino a 10 locali (ristoranti/
// hotel) nell'area servita (o nelle province scelte dalla dashboard) con
// un'email pubblica sul sito, e prepara una bozza di email di
// collaborazione usando SEMPRE lo stesso modello che Andrea ha validato
// nella pagina "Locali" (data/outreach-template.json) — l'unica parte che
// cambia da un locale all'altro è il nome del locale stesso.
//
// Questo agente non invia MAI nulla in autonomia: ogni bozza resta
// "bozza-da-rivedere". L'invio (manuale con un tap, o automatico entro un
// limite giornaliero) è deciso da Andrea dalla dashboard — l'invio
// automatico opzionale gira su Vercel, vedi
// dashboard/app/api/cron/outreach-auto-send/route.ts.
//
// Limite onesto: i dati di OpenStreetMap non includono quasi mai il nome
// di chi gestisce il locale, quindi le email si rivolgono al locale in
// generale ("Gentile team di..."), mai a una persona inventata.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readData, writeData, readBrand, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { inviaMessaggioTelegram } from "../lib/telegram.js";
import { geocodifica, cercaLocaliVicini, trovaEmailSulSito, type LocaleTrovato } from "../lib/openStreetMap.js";
import { PROVINCE } from "../lib/province.js";
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
  inviataAutomaticamente?: boolean;
}

interface OutreachFile {
  _istruzioni: string;
  contatti: ContattoLocale[];
}

interface OutreachConfigFile {
  _istruzioni: string;
  province: string[]; // sigle, vedi lib/province.ts
}

// Serravalle Scrivia (AL): posizione approssimativa nota, usata solo se la
// geocodifica in tempo reale (Nominatim) non dovesse rispondere.
const FALLBACK_COORDINATE = { lat: 44.7166, lon: 8.8555 };

const MASSIMO_AL_GIORNO = 10;

// Firma reale, mai toccata dall'LLM (stesso principio della CTA nelle
// didascalie social — vedi content-agent.ts): l'LLM/il template chiudono
// solo con "Andrea", i contatti veri vengono sempre aggiunti qui in coda,
// mai inventati o lasciati generare a un modello.
function firma(brand: Record<string, any>): string {
  const righe = [
    `Andrea${brand.nomeArte ? ` — ${brand.nomeArte}` : ""}`,
    brand.contatti?.telefono ? `Tel: ${brand.contatti.telefono}` : null,
    brand.contatti?.email ? `Email: ${brand.contatti.email}` : null,
    brand.contatti?.instagram ? `Instagram: instagram.com/${String(brand.contatti.instagram).replace(/^@/, "")}` : null,
    brand.contatti?.facebook ? `Facebook: cerca "${brand.contatti.facebook}"` : null,
    brand.contatti?.sitoWeb ? `Sito/recensioni: ${brand.contatti.sitoWeb}` : null
  ].filter((r): r is string => Boolean(r));
  return righe.join("\n");
}

interface OutreachTemplateFile {
  oggetto: string;
  corpo: string;
  validatoIl: string | null;
}

// Modello di riserva, usato solo se data/outreach-template.json non fosse
// leggibile per qualche motivo: stesso testo che Andrea trova già pronto
// (e può modificare) la prima volta che apre la pagina "Locali".
const MODELLO_DI_RISERVA: { oggetto: string; corpo: string } = {
  oggetto: "Proposta di collaborazione — Forte DJ",
  corpo: `Buongiorno,

sono Andrea di Forte DJ, DJ professionista per matrimoni ed eventi (20 anni di esperienza, 200+ eventi, oltre 75 recensioni a 5 stelle).

Mi piacerebbe presentarmi a voi di {{LOCALE}} come possibile fornitore di fiducia per i matrimoni ed eventi che ospitate: playlist su misura, impianto audio/luci/fumo completo, montaggio in meno di un'ora.

Se vi va, sarei felice di mandarvi qualche referenza o fissare un sopralluogo tecnico quando preferite.

Grazie per l'attenzione,
Andrea`
};

// {{LOCALE}} è l'unica parte che cambia da un'email all'altra: il resto
// del testo è sempre quello che Andrea ha validato nella pagina "Locali"
// (o il modello di riserva sopra, finché non ne salva uno).
function applicaModello(testo: string, nomeLocale: string): string {
  return testo.replace(/\{\{\s*LOCALE\s*\}\}/g, nomeLocale);
}

async function scriviEmailDaModello(nomeLocale: string): Promise<{ oggetto: string; corpo: string; metodo: string }> {
  const modello = await readData<OutreachTemplateFile>("outreach-template.json").catch(() => MODELLO_DI_RISERVA);
  return {
    oggetto: applicaModello(modello.oggetto, nomeLocale),
    corpo: applicaModello(modello.corpo, nomeLocale),
    metodo: "modello-validato"
  };
}

// Cerca i locali nelle province scelte dalla dashboard (una ricerca per
// ogni capoluogo, raggio più piccolo perché copre una sola provincia) — o,
// se non ne è stata scelta nessuna, nel raggio intorno alla sede come
// prima. Deduplica per osmId: la stessa struttura può comparire dalla
// ricerca di più province confinanti.
async function cercaCandidati(brand: Record<string, any>, province: string[]): Promise<LocaleTrovato[]> {
  const trovati = new Map<string, LocaleTrovato>();

  if (province.length > 0) {
    const selezionate = PROVINCE.filter((p) => province.includes(p.sigla));
    for (const provincia of selezionate) {
      const centro = await geocodifica(`${provincia.capoluogo}, Italia`, FALLBACK_COORDINATE);
      // 25km da un capoluogo copre bene una provincia media senza appesantire
      // troppo la query Overpass (vedi lib/openStreetMap.ts per la storia
      // dei tentativi precedenti con raggi più larghi).
      const locali = await cercaLocaliVicini(centro, 25000);
      for (const l of locali) trovati.set(l.osmId, l);
    }
  } else {
    const indirizzoBase = brand.areaServita?.base ?? "Serravalle Scrivia, Italia";
    const raggioKmConfigurato = parseInt(brand.areaServita?.raggioAzione ?? "100", 10) || 100;
    const raggioKm = Math.min(raggioKmConfigurato, 60);
    const centro = await geocodifica(indirizzoBase, FALLBACK_COORDINATE);
    const locali = await cercaLocaliVicini(centro, raggioKm * 1000);
    for (const l of locali) trovati.set(l.osmId, l);
  }

  return [...trovati.values()];
}

export async function eseguiOutreachAgent(): Promise<void> {
  try {
    const brand = await readBrand<Record<string, any>>();
    const outreachFile = await readData<OutreachFile>("outreach-locali.json");
    const config = await readData<OutreachConfigFile>("outreach-config.json").catch(() => ({ _istruzioni: "", province: [] }));

    // Doppio controllo: mai due volte lo stesso locale (osmId) E mai due
    // volte la stessa casella email (es. una catena con più sedi che
    // condividono lo stesso indirizzo di contatto).
    const osmIdGiaTrattati = new Set(outreachFile.contatti.map((c) => c.osmId));
    const emailGiaTrattate = new Set(outreachFile.contatti.map((c) => c.email.toLowerCase()));

    let trovati: LocaleTrovato[] = [];
    try {
      trovati = await cercaCandidati(brand, config.province ?? []);
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
      if (emailGiaTrattate.has(email.toLowerCase())) continue; // stessa casella già contattata da un altro locale

      const { oggetto, corpo, metodo } = await scriviEmailDaModello(locale.nome);

      outreachFile.contatti.unshift({
        id: randomUUID(),
        osmId: locale.osmId,
        nomeLocale: locale.nome,
        categoria: locale.categoria,
        indirizzo: locale.indirizzo,
        sitoWeb: locale.sitoWeb,
        email,
        oggetto,
        corpo: `${corpo}\n\n${firma(brand)}`,
        metodo,
        status: "bozza-da-rivedere",
        creatoIl: nowIso(),
        inviataIl: null
      });
      emailGiaTrattate.add(email.toLowerCase());
      nuoviContatti++;
    }

    if (nuoviContatti > 0) {
      await writeData("outreach-locali.json", outreachFile);
      await inviaMessaggioTelegram(
        `📍 ${nuoviContatti} nuove bozze di email per locali della zona, pronte in "Da rivedere" nella dashboard (pagina "Locali"). Invio manuale con un tap, oppure automatico entro il limite giornaliero se l'hai attivato.`
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
