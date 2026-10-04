export type BadgeTone = "ok" | "warn" | "err" | "neutral" | "accent";

export interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

const AGENT_STATUS: Record<string, StatusMeta> = {
  ok: { label: "OK", tone: "ok" },
  errore: { label: "Errore", tone: "err" },
  "nessuna-azione": { label: "Nessuna azione", tone: "neutral" }
};

const QUEUE_STATUS: Record<string, StatusMeta> = {
  "in-coda": { label: "In coda", tone: "neutral" },
  programmato: { label: "Programmato", tone: "accent" },
  pubblicato: { label: "Pubblicato", tone: "ok" },
  errore: { label: "Errore", tone: "err" },
  "in-pausa": { label: "In pausa", tone: "warn" }
};

const OUTREACH_STATUS: Record<string, StatusMeta> = {
  "bozza-da-rivedere": { label: "Da rivedere", tone: "warn" },
  inviata: { label: "Inviata", tone: "ok" },
  scartata: { label: "Scartata", tone: "neutral" }
};

const REEL_STATUS: Record<string, StatusMeta> = {
  "in-coda-analisi": { label: "In analisi", tone: "neutral" },
  pronto: { label: "Pronto", tone: "ok" },
  errore: { label: "Errore", tone: "err" },
  usato: { label: "Usato", tone: "accent" }
};

const SEO_PROPOSAL_STATUS: Record<string, StatusMeta> = {
  proposta: { label: "Da rivedere", tone: "warn" },
  applicata: { label: "Applicata", tone: "ok" },
  scartata: { label: "Scartata", tone: "neutral" }
};

const LEAD_STATUS: Record<string, StatusMeta> = {
  nuovo: { label: "Nuovo", tone: "warn" },
  inviato: { label: "Inviato", tone: "ok" },
  scartato: { label: "Scartato", tone: "neutral" }
};

const QUESTIONARIO_STATUS: Record<string, StatusMeta> = {
  nuovo: { label: "Nuovo", tone: "warn" },
  letto: { label: "Letto", tone: "neutral" }
};

const PRIORITY: Record<string, StatusMeta> = {
  HIGH: { label: "Alta priorità", tone: "err" },
  MEDIUM: { label: "Media priorità", tone: "warn" },
  LOW: { label: "Bassa priorità", tone: "neutral" }
};

const INTERNAL_LINK_STATUS: Record<string, StatusMeta> = {
  ORPHAN: { label: "Orfana", tone: "err" },
  POCO_COLLEGATA: { label: "Poco collegata", tone: "warn" },
  OK: { label: "OK", tone: "ok" }
};

function resolve(map: Record<string, StatusMeta>, key: string): StatusMeta {
  return map[key] ?? { label: key, tone: "neutral" };
}

export const statusVocabulary = {
  agentRun: (status: string) => resolve(AGENT_STATUS, status),
  queueItem: (status: string) => resolve(QUEUE_STATUS, status),
  outreach: (status: string) => resolve(OUTREACH_STATUS, status),
  reelJob: (status: string) => resolve(REEL_STATUS, status),
  seoProposal: (status: string) => resolve(SEO_PROPOSAL_STATUS, status),
  lead: (status: string) => resolve(LEAD_STATUS, status),
  questionario: (status: string) => resolve(QUESTIONARIO_STATUS, status),
  priority: (priority: string) => resolve(PRIORITY, priority),
  internalLink: (status: string) => resolve(INTERNAL_LINK_STATUS, status)
};
