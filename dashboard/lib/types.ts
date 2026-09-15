export interface KpisFile {
  ultimoAggiornamento: string | null;
  instagram: { followers: number | null; followersTrend7g: number | null; reachMedio30g: number | null; engagementRateMedio30g: number | null };
  facebook: { followers: number | null; reachMedio30g: number | null };
  obiettivo2027: { matrimoniTarget: number; matrimoniConfermati: number; matrimoniInTrattativa: number; leadAttivi: number };
}

export interface AgentRun {
  agente: string;
  identita: string;
  timestamp: string;
  status: "ok" | "errore" | "nessuna-azione";
  riepilogo: string;
  dettagli?: Record<string, unknown>;
}

export interface AgentRunsFile {
  runs: AgentRun[];
}

export interface QueueItem {
  id: string;
  formato: string;
  status: string;
  caption: string | null;
  hashtags: string[];
  orarioProgrammato: string | null;
  pillarId?: string;
  media: { filename: string; mimeType: string };
}

export interface PostsQueueFile {
  queue: QueueItem[];
}

export interface PublishedItem {
  queueId: string;
  timestamp: string;
  instagramId: string;
  facebookId: string;
  formato: string;
  pillarId: string | null;
}

export interface PublishedLogFile {
  log: PublishedItem[];
}

export interface Lead {
  id: string;
  username: string;
  fonte: string;
  commentoOriginale: string;
  messaggioProposto: string;
  status: string;
  creatoIl: string;
}

export interface LeadsFile {
  leads: Lead[];
}

export interface StrategyFile {
  obiettivo: string;
  logicaTemporale: string;
  fasi: Array<{ id: string; nome: string; periodo: string; obiettivi: string[] }>;
  canaliAcquisizione: string[];
  progresso: {
    ultimoAggiornamento: string | null;
    faseCorrente: string;
    matrimoniConfermati: number;
    leadInPipeline: number;
    partnershipAttive: number;
    note: string[];
  };
}
