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
  dataProgrammata?: string | null;
  pillarId?: string;
  istruzioniUtente?: string | null;
  media: { filename: string; mimeType: string; downloadUrl: string; source?: string };
  ultimoErrore?: string | null;
  tentativiFalliti?: number;
}

export interface PostsQueueFile {
  queue: QueueItem[];
}

export interface PublishedItem {
  queueId: string;
  timestamp: string;
  instagramId: string | null;
  facebookId: string | null;
  formato: string;
  pillarId: string | null;
  nota?: string;
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

export interface RispostaCommento {
  commentId: string;
  mediaId: string;
  permalink: string | null;
  username: string;
  commentoOriginale: string;
  risposta: string;
  timestamp: string;
}

export interface RispostiFile {
  risposte: RispostaCommento[];
}

export interface ContattoLocale {
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

export interface OutreachFile {
  contatti: ContattoLocale[];
}

export interface OutreachConfigFile {
  province: string[];
  invioAutomatico?: { attivo: boolean; maxAlGiorno: number };
}

export interface OutreachTemplateFile {
  oggetto: string;
  corpo: string;
  validatoIl: string | null;
}

// Specchio di site/lib/seoEngineTypes.ts (progetto separato, stesso
// repository): la dashboard legge/scrive site/data/seo/seo-proposte.json
// per la pagina "SEO", vedi dashboard/lib/dataSource.ts > leggiDatiRepo /
// aggiornaDatiSuPercorso.
export type SeoProposalStatus = "proposta" | "applicata" | "scartata";

export interface SeoProposal {
  id: string;
  page: string;
  pageLabel: string;
  query: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  metaNamespace: string;
  metaTitleKey: string;
  metaDescriptionKey: string | null;
  titleAttuale: string;
  titleProposto: string;
  descriptionAttuale: string | null;
  descriptionProposta: string | null;
  status: SeoProposalStatus;
  creatoIl: string;
  decisoIl: string | null;
}

export interface SeoProposalsFile {
  proposte: SeoProposal[];
}

export type ProfiloReel = "auto" | "dj_party" | "wedding" | "event" | "business" | "talking_head" | "promotional";

export interface PianoReel {
  categoria: string;
  stile: "clean" | "dynamic" | "bold";
  profiloUsato: ProfiloReel;
  durataTarget: number;
  hook: { inizio: number; fine: number };
  segmenti: Array<{ inizio: number; fine: number; motivo: string }>;
  sottotitoli: boolean;
  musica: boolean;
  testoHook: string | null;
  testoChiusura: string | null;
}

export interface ReelJob {
  id: string;
  createdAt: string;
  videoUrl: string;
  filename: string;
  mimeType: string;
  profilo: ProfiloReel;
  istruzioni: string | null;
  status: "in-coda-analisi" | "pronto" | "errore" | "usato";
  step: string;
  aggiornatoIl: string;
  erroreMessaggio: string | null;
  risultato: { reelUrl: string; durataSecondi: number; piano: PianoReel } | null;
  source?: "dashboard" | "telegram";
}

export interface ReelJobsFile {
  jobs: ReelJob[];
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
