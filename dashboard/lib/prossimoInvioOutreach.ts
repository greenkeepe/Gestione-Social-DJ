import type { ContattoLocale } from "./types";

// Il cron di invio automatico (dashboard/app/api/cron/outreach-auto-send)
// gira una volta al giorno, sempre intorno alle 10:00 ora italiana (vedi
// dashboard/vercel.json: 08:00 UTC in stagione con ora legale, 09:00 UTC
// nel resto dell'anno — Vercel Hobby applica comunque una "finestra
// flessibile" di un'ora, quindi può scattare fino alle 11:00). Qui
// ricostruiamo la stessa logica (stesso ordinamento, stesso limite
// giornaliero) solo per ANTICIPARE in dashboard quali bozze partiranno e
// quando — nessuna scrittura, nessun invio reale avviene da questa funzione.
const ORA_CRON_LOCALE = 10;

function offsetRomaMinuti(data: Date): number {
  const parti = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", timeZoneName: "shortOffset" }).formatToParts(data);
  const tz = parti.find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const match = tz.match(/GMT([+-]\d+)/);
  return match ? Number(match[1]) * 60 : 60;
}

// Prossime N esecuzioni del cron (una al giorno), a partire da adesso.
export function prossimeEsecuzioniCron(adesso: Date, quante: number): Date[] {
  const offsetMin = offsetRomaMinuti(adesso);
  const oraRomaWall = new Date(adesso.getTime() + offsetMin * 60000);
  const oggiAlleDieci = new Date(
    Date.UTC(oraRomaWall.getUTCFullYear(), oraRomaWall.getUTCMonth(), oraRomaWall.getUTCDate(), ORA_CRON_LOCALE, 0, 0) - offsetMin * 60000
  );
  const primaEsecuzione = oggiAlleDieci > adesso ? oggiAlleDieci : new Date(oggiAlleDieci.getTime() + 24 * 60 * 60 * 1000);
  return Array.from({ length: quante }, (_, i) => new Date(primaEsecuzione.getTime() + i * 24 * 60 * 60 * 1000));
}

export interface InvioPrevisto {
  contatto: ContattoLocale;
  previstoIl: Date;
}

// Stessa selezione/ordinamento del cron reale: solo bozze "da rivedere", mai
// un indirizzo già contattato in passato, le più vecchie prima, raggruppate
// in blocchi da "maxAlGiorno" — un blocco per ogni prossima esecuzione.
export function calcolaProssimiInvii(contatti: ContattoLocale[], maxAlGiorno: number, adesso: Date): InvioPrevisto[] {
  if (maxAlGiorno <= 0) return [];

  const emailGiaContattate = new Set(contatti.filter((c) => c.status === "inviata").map((c) => c.email.toLowerCase()));
  const inAttesa = contatti
    .filter((c) => c.status === "bozza-da-rivedere" && !emailGiaContattate.has(c.email.toLowerCase()))
    .sort((a, b) => new Date(a.creatoIl).getTime() - new Date(b.creatoIl).getTime());

  if (inAttesa.length === 0) return [];

  const numeroBlocchi = Math.ceil(inAttesa.length / maxAlGiorno);
  const esecuzioni = prossimeEsecuzioniCron(adesso, numeroBlocchi);

  return inAttesa.map((contatto, indice) => ({
    contatto,
    previstoIl: esecuzioni[Math.floor(indice / maxAlGiorno)]
  }));
}
