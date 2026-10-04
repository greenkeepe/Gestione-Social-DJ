// Calcolo euristico del "miglior orario" per pubblicare.
// Finché non abbiamo abbastanza dati reali (Insights API) usiamo fasce
// orarie note per essere efficaci sul pubblico wedding-italiano
// (studi di settore: picco pausa pranzo e dopo cena). Una volta che
// l'Analytics Agent ha raccolto storico sufficiente (>= 20 post), calcola
// l'orario migliore reale confrontando l'engagement per fascia oraria.
import type { AgentRun } from "./agentLog.js";

export interface OrarioConsigliato {
  ora: string; // "HH:mm" in Europe/Rome
  motivo: string;
}

const FASCE_DI_DEFAULT: OrarioConsigliato[] = [
  { ora: "12:30", motivo: "pausa pranzo, picco di utilizzo social" },
  { ora: "18:30", motivo: "fine giornata lavorativa" },
  { ora: "21:15", motivo: "dopo cena, massima disponibilità mentale per contenuti wedding" }
];

export function scegliOrarioDelGiorno(giornoSettimana: number, storicoEngagement?: Array<{ ora: string; engagement: number }>): OrarioConsigliato {
  if (storicoEngagement && storicoEngagement.length >= 20) {
    const migliore = [...storicoEngagement].sort((a, b) => b.engagement - a.engagement)[0];
    return { ora: migliore.ora, motivo: "orario con miglior engagement storico reale (dati Insights)" };
  }
  // il weekend (5=venerdì,6=sabato,0=domenica) l'engagement wedding è più alto la sera
  const isWeekend = giornoSettimana === 5 || giornoSettimana === 6 || giornoSettimana === 0;
  return isWeekend ? FASCE_DI_DEFAULT[2] : FASCE_DI_DEFAULT[Math.floor(Math.random() * 2)];
}

export interface PianificazionePubblicazione {
  data: string; // "YYYY-MM-DD"
  ora: string; // "HH:mm"
  motivo: string;
}

// Sceglie GIORNO e ora per un nuovo contenuto, invece del solo orario:
// prende il primo giorno libero a partire da oggi (nessun altro contenuto
// "pronto"/pubblicato già programmato per quel giorno, passato in
// `dateOccupate`) e su quel giorno applica scegliOrarioDelGiorno(). Così un
// caricamento massivo di più foto/video finisce spalmato su più giorni
// diversi in Anteprima — uno al giorno, come pubblica davvero
// publishing-agent.ts — invece che ammucchiato tutto su oggi.
export function pianificaProssimaPubblicazione(
  dateOccupate: Set<string>,
  storicoEngagement?: Array<{ ora: string; engagement: number }>,
  partenza: Date = new Date()
): PianificazionePubblicazione {
  const cursore = new Date(partenza);
  cursore.setHours(0, 0, 0, 0);
  for (;;) {
    const iso = cursore.toISOString().slice(0, 10);
    if (!dateOccupate.has(iso)) {
      const orario = scegliOrarioDelGiorno(cursore.getDay(), storicoEngagement);
      return { data: iso, ora: orario.ora, motivo: orario.motivo };
    }
    cursore.setDate(cursore.getDate() + 1);
  }
}
