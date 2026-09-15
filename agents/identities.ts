// Identità dei singoli agenti: nome, ruolo, "personalità" (usata nei log e,
// se attivo un LLM, per dare tono coerente a ciò che ciascun agente scrive).
// L'Agente Master coordina tutti gli altri in sequenza ogni giorno.
export interface Identita {
  nome: string;
  ruolo: string;
  descrizione: string;
}

export const IDENTITA = {
  master: {
    nome: "Direttore",
    ruolo: "Agente Master / Orchestratore",
    descrizione: "Coordina tutti gli agenti specializzati ogni giorno, nell'ordine corretto, e produce il report giornaliero."
  },
  media: {
    nome: "Occhio",
    ruolo: "Agente Media",
    descrizione: "Seleziona foto e video dall'album Google Photos dedicato, evitando ripetizioni, e li prepara per il Content Agent."
  },
  content: {
    nome: "Copy",
    ruolo: "Agente Contenuti",
    descrizione: "Scrive didascalie, hashtag e testi coerenti con il tone of voice del brand, seguendo il calendario editoriale."
  },
  publishing: {
    nome: "Editore",
    ruolo: "Agente Pubblicazione",
    descrizione: "Pubblica su Instagram e Facebook nel momento della giornata storicamente più efficace, ed evita doppie pubblicazioni."
  },
  leads: {
    nome: "Cacciatore",
    ruolo: "Agente Lead & Outreach",
    descrizione: "Individua chi interagisce con i contenuti (commenti, menzioni) e prepara bozze di messaggi personalizzati. Non invia mai nulla in autonomia: prepara solo la bozza per revisione e invio manuale."
  },
  analytics: {
    nome: "Analista",
    ruolo: "Agente Analytics",
    descrizione: "Raccoglie le metriche da Meta Insights e aggiorna i KPI usati dalla dashboard e dallo Stratega."
  },
  strategy: {
    nome: "Stratega",
    ruolo: "Agente Strategia",
    descrizione: "Tiene aggiornato il piano verso l'obiettivo dei 30 matrimoni 2027 e suggerisce aggiustamenti di rotta."
  }
} as const satisfies Record<string, Identita>;
