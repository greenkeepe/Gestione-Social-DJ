// Agente "Esploratore" — gira ogni giorno dentro il ciclo del Direttore e
// tiene la coda "bozza-da-rivedere" sempre piena fino al numero impostato
// nella casella "invio automatico" della pagina "Locali"
// (data/outreach-config.json > invioAutomatico.maxAlGiorno): cerca solo
// tanti nuovi locali che fanno eventi (nelle città/province scelte dalla
// dashboard, o intorno alla sede) quanti ne mancano per arrivare a quel numero, mai
// di più — se la coda è già piena non cerca nulla. Ogni bozza usa SEMPRE lo
// stesso modello che Andrea ha validato nella pagina "Locali"
// (data/outreach-template.json) — l'unica parte che cambia da un locale
// all'altro è il nome del locale stesso.
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
//
// La bozza salvata qui è solo il messaggio: la firma coi contatti veri
// (telefono, email, WhatsApp, Instagram, sito) viene aggiunta al momento
// dell'invio, non qui — vedi dashboard/lib/firma.ts.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readData, writeData, readBrand, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { inviaMessaggioTelegram } from "../lib/telegram.js";
import { geocodifica, geocodificaCitta, cercaLocaliVicini, analizzaSito, scegliEmail, CATEGORIE_EVENTI, type LocaleTrovato } from "../lib/openStreetMap.js";
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
  citta?: string[]; // città/paesi scelti nella pagina "Locali"
  raggioKm?: number; // raggio di ricerca intorno a ogni città
  invioAutomatico?: { attivo: boolean; maxAlGiorno: number };
}

// Serravalle Scrivia (AL): posizione approssimativa nota, usata solo se la
// geocodifica in tempo reale (Nominatim) non dovesse rispondere.
const FALLBACK_COORDINATE = { lat: 44.7166, lon: 8.8555 };

// Usato solo se outreach-config.json non fosse leggibile o non avesse
// ancora un "invioAutomatico.maxAlGiorno" impostato.
const TARGET_CODA_DI_RISERVA = 10;

interface OutreachTemplateFile {
  oggetto: string;
  corpo: string;
  validatoIl: string | null;
}

// Modello di riserva, usato solo se data/outreach-template.json non fosse
// leggibile per qualche motivo: stesso testo che Andrea trova già pronto
// (e può modificare) la prima volta che apre la pagina "Locali". Il corpo
// qui è SOLO il messaggio: la firma coi contatti veri (telefono, email,
// WhatsApp, Instagram, sito) viene aggiunta al momento dell'invio da
// dashboard/lib/firma.ts, letta ogni volta da config/brand.json — mai
// salvata in questo file, così resta sempre aggiornata da sola.
const MODELLO_DI_RISERVA: { oggetto: string; corpo: string } = {
  oggetto: "Collaborazione per Eventi e/o Matrimoni.",
  corpo: `Buongiorno,
sono Andrea di Forte DJ, DJ professionista specializzato in matrimoni ed eventi, con oltre 20 anni di esperienza, più di 200 eventi realizzati e oltre 75 recensioni a 5 stelle.
Mi piacerebbe entrare in contatto con {{LOCALE}} per valutare una possibile collaborazione come vostro DJ e fornitore di fiducia per matrimoni ed eventi.
Offro un servizio completo e personalizzato, che comprende:

* 🎧 DJ set e playlist personalizzate in base agli sposi e al tipo di evento
* 🔊 Impianto audio professionale
* 💡 Luci scenografiche
* 🌫️ Effetti fumo
* ⚡ Montaggio e preparazione tecnica in meno di un'ora
* 🤝 Massima attenzione alla collaborazione con location e staff durante l'evento

L'obiettivo è offrirvi un servizio affidabile e professionale, che possa diventare un valore aggiunto per gli eventi organizzati presso la vostra struttura.
Se siete interessati, sarei felice di conoscervi di persona e fissare un breve sopralluogo, così da presentarvi il mio servizio e valutare insieme eventuali modalità di collaborazione.
Grazie per l'attenzione e resto a disposizione.
Un saluto,`
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

// ---------- Zone di ricerca e scorta di locali trovati ----------
// Zone: le città scelte nella pagina "Locali" (ognuna col raggio scelto),
// più i capoluoghi delle province spuntate; se non c'è nulla, il raggio
// intorno alla sede (config/brand.json).
//
// I locali trovati su OpenStreetMap restano in una scorta
// (data/outreach-candidati.json): una zona si ricerca solo ogni
// GIORNI_VALIDITA_ZONA giorni o quando la sua scorta è finita. Così un
// giorno in cui OpenStreetMap non risponde le bozze si preparano lo stesso,
// e i siti già letti senza email/eventi non vengono riletti ogni giorno.
interface Zona { chiave: string; nome: string; raggioKm: number; tipo: "citta" | "provincia" | "sede" }
type Candidato = LocaleTrovato & { zona: string };
interface ScortaFile {
  _istruzioni: string;
  zone: Record<string, { cercataIl: string; trovati: number }>;
  candidati: Candidato[];
  esaminati: Record<string, { il: string; motivo: string }>;
}
const GIORNI_VALIDITA_ZONA = 10;
const GIORNI_PRIMA_DI_RIESAMINARE = 60;
const MAX_ESAMINATI_PER_GIRO = 80;
const TEMPO_MAX_MS = 12 * 60 * 1000;
const RAGGIO_KM_DI_RISERVA = 15;

function zoneDaConfig(config: OutreachConfigFile, brand: Record<string, any>): Zona[] {
  const raggio = Math.min(60, Math.max(3, Number(config.raggioKm) || RAGGIO_KM_DI_RISERVA));
  const zone: Zona[] = [];
  for (const c of config.citta ?? []) {
    const nome = c.trim();
    if (nome) zone.push({ chiave: `citta:${nome.toLowerCase()}:${raggio}`, nome, raggioKm: raggio, tipo: "citta" });
  }
  for (const p of PROVINCE.filter((p) => (config.province ?? []).includes(p.sigla))) {
    // 25km da un capoluogo copre bene una provincia media
    zone.push({ chiave: `provincia:${p.sigla}`, nome: p.capoluogo, raggioKm: 25, tipo: "provincia" });
  }
  if (!zone.length) {
    const base = brand.areaServita?.base ?? "Serravalle Scrivia, Italia";
    const raggioSede = Math.min(parseInt(brand.areaServita?.raggioAzione ?? "30", 10) || 30, 30);
    zone.push({ chiave: `sede:${base.toLowerCase()}:${raggioSede}`, nome: base, raggioKm: raggioSede, tipo: "sede" });
  }
  return zone;
}

// Priorità: prima i posti che fanno eventi per definizione, poi quelli col
// nome da location (villa, tenuta, ricevimenti...), poi ristoranti/bar/hotel
// (che passano solo se il loro sito parla di eventi). A parità, a caso.
const priorita = (c: LocaleTrovato) => (CATEGORIE_EVENTI.has(c.categoria) ? 0 : c.nomeDaEventi ? 1 : 2);

export async function eseguiOutreachAgent(): Promise<void> {
  try {
    const brand = await readBrand<Record<string, any>>();
    const outreachFile = await readData<OutreachFile>("outreach-locali.json");
    const config = await readData<OutreachConfigFile>("outreach-config.json").catch(
      (): OutreachConfigFile => ({ _istruzioni: "", province: [] })
    );

    // Tiene la coda "bozza-da-rivedere" sempre piena fino al numero deciso
    // nella casella "invio automatico" (pagina "Locali") — se è già piena
    // (o oltre), non cerca nulla: niente query Overpass/OSM inutili.
    const targetCoda = config.invioAutomatico?.maxAlGiorno ?? TARGET_CODA_DI_RISERVA;
    const bozzeAttuali = outreachFile.contatti.filter((c) => c.status === "bozza-da-rivedere").length;
    const daTrovare = Math.max(0, targetCoda - bozzeAttuali);

    if (daTrovare === 0) {
      await logAgentRun({
        agente: IDENTITA.outreach.nome,
        identita: IDENTITA.outreach.ruolo,
        status: "nessuna-azione",
        riepilogo: `Coda già piena: ${bozzeAttuali} bozze da rivedere su un target di ${targetCoda}.`
      });
      return;
    }

    // Doppio controllo: mai due volte lo stesso locale (osmId) E mai due
    // volte la stessa casella email (es. una catena con più sedi che
    // condividono lo stesso indirizzo di contatto).
    const osmIdGiaTrattati = new Set(outreachFile.contatti.map((c) => c.osmId));
    const emailGiaTrattate = new Set(outreachFile.contatti.map((c) => c.email.toLowerCase()));

    const scorta = await readData<ScortaFile>("outreach-candidati.json").catch(
      (): ScortaFile => ({
        _istruzioni: "Scorta dei locali trovati su OpenStreetMap dall'Agente Esploratore (agents/outreach-agent.ts), per zona di ricerca. Gestita dall'agente: non serve modificarla a mano.",
        zone: {},
        candidati: [],
        esaminati: {}
      })
    );
    const adesso = Date.now();
    const esaminatoDiRecente = (osmId: string) => {
      const e = scorta.esaminati[osmId];
      return Boolean(e && adesso - new Date(e.il).getTime() < GIORNI_PRIMA_DI_RIESAMINARE * 864e5);
    };
    const disponibile = (c: Candidato) => !osmIdGiaTrattati.has(c.osmId) && !esaminatoDiRecente(c.osmId);

    // 1. aggiorna su OpenStreetMap le zone vecchie o senza più candidati
    const zone = zoneDaConfig(config, brand);
    const erroriZone: string[] = [];
    for (const zona of zone) {
      const info = scorta.zone[zona.chiave];
      const recente = info && adesso - new Date(info.cercataIl).getTime() < GIORNI_VALIDITA_ZONA * 864e5;
      const restano = scorta.candidati.some((c) => c.zona === zona.chiave && disponibile(c));
      if (recente && restano) continue;
      try {
        const centro = zona.tipo === "sede" ? await geocodifica(zona.nome, FALLBACK_COORDINATE) : await geocodificaCitta(zona.nome);
        if (!centro) { erroriZone.push(`${zona.nome}: città non trovata`); continue; }
        const trovati = await cercaLocaliVicini(centro, zona.raggioKm * 1000);
        const giaInScorta = new Set(scorta.candidati.map((c) => c.osmId));
        for (const l of trovati) if (!giaInScorta.has(l.osmId)) scorta.candidati.push({ ...l, zona: zona.chiave });
        scorta.zone[zona.chiave] = { cercataIl: nowIso(), trovati: trovati.length };
      } catch (err) {
        erroriZone.push(`${zona.nome}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 200));
      }
      await new Promise((r) => setTimeout(r, 1100)); // Nominatim: massimo 1 richiesta al secondo
    }

    // 2. candidati delle zone attive, i più adatti agli eventi per primi
    const chiaviAttive = new Set(zone.map((z) => z.chiave));
    const candidati = scorta.candidati
      .filter((c) => chiaviAttive.has(c.zona) && disponibile(c))
      .map((c) => ({ c, r: Math.random() }))
      .sort((a, b) => priorita(a.c) - priorita(b.c) || a.r - b.r)
      .map((x) => x.c);

    let nuoviContatti = 0;
    let esaminatiOra = 0;
    const inizio = Date.now();
    for (const locale of candidati) {
      if (nuoviContatti >= daTrovare || esaminatiOra >= MAX_ESAMINATI_PER_GIRO || Date.now() - inizio > TEMPO_MAX_MS) break;
      esaminatiOra++;

      // Posti da eventi per definizione: basta un'email (quella su
      // OpenStreetMap o quella sul sito). Ristoranti/bar/hotel: solo se il
      // loro sito parla di eventi, feste, matrimoni, serate.
      const daEventi = CATEGORIE_EVENTI.has(locale.categoria) || locale.nomeDaEventi;
      let email = locale.emailOsm;
      let motivo = "";
      if (!daEventi || !email) {
        const sito = locale.sitoWeb ? await analizzaSito(locale.sitoWeb).catch(() => ({ email: null, faEventi: false })) : { email: null, faEventi: false };
        if (!daEventi && !sito.faEventi) motivo = "il sito non parla di eventi";
        email = scegliEmail([email ?? "", sito.email ?? ""].filter(Boolean), locale.sitoWeb) ?? email ?? sito.email;
      }
      if (!motivo && !email) motivo = "nessuna email pubblica";
      if (!motivo && emailGiaTrattate.has(email!.toLowerCase())) motivo = "email già contattata";
      if (motivo) {
        scorta.esaminati[locale.osmId] = { il: nowIso(), motivo };
        continue; // mai un'email inventata
      }

      const { oggetto, corpo, metodo } = await scriviEmailDaModello(locale.nome);

      outreachFile.contatti.unshift({
        id: randomUUID(),
        osmId: locale.osmId,
        nomeLocale: locale.nome,
        categoria: locale.categoria,
        indirizzo: locale.indirizzo,
        sitoWeb: locale.sitoWeb,
        email: email!,
        oggetto,
        corpo,
        metodo,
        status: "bozza-da-rivedere",
        creatoIl: nowIso(),
        inviataIl: null
      });
      emailGiaTrattate.add(email!.toLowerCase());
      nuoviContatti++;
    }

    // la scorta si salva sempre (zone ricercate, siti già letti)
    await writeData("outreach-candidati.json", scorta);
    if (nuoviContatti > 0) {
      await writeData("outreach-locali.json", outreachFile);
      await inviaMessaggioTelegram(
        `📍 ${nuoviContatti} nuove bozze di email per locali che fanno eventi, pronte in "Da rivedere" nella dashboard (pagina "Locali"). Partono da sole entro il limite giornaliero se l'invio automatico è attivo.`
      );
    }

    const nomiZone = zone.map((z) => (z.tipo === "provincia" ? `provincia di ${z.nome}` : `${z.nome} (${z.raggioKm} km)`)).join(", ");
    const restanti = scorta.candidati.filter((c) => chiaviAttive.has(c.zona) && disponibile(c)).length;
    await logAgentRun({
      agente: IDENTITA.outreach.nome,
      identita: IDENTITA.outreach.ruolo,
      // errore solo se non si è potuto preparare nulla E OpenStreetMap non ha risposto
      status: nuoviContatti > 0 ? "ok" : erroriZone.length && !candidati.length ? "errore" : "nessuna-azione",
      riepilogo:
        (nuoviContatti > 0
          ? `Preparate ${nuoviContatti} bozze per locali che fanno eventi in ${nomiZone} (coda ${bozzeAttuali + nuoviContatti}/${targetCoda}).`
          : `Nessuna nuova bozza in ${nomiZone}: ${esaminatiOra} locali esaminati, nessuno con email pubblica e attività di eventi (coda ${bozzeAttuali}/${targetCoda}).`) +
        ` Locali ancora da esaminare in scorta: ${restanti}.` +
        (erroriZone.length ? ` OpenStreetMap non ha risposto per: ${erroriZone.join("; ")}.` : ""),
      ...(erroriZone.length ? { dettagli: { erroriZone } } : {})
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
