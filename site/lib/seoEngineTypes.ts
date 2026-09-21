// Forme dati condivise tra gli script dell'SEO Engine (site/scripts/seo/)
// e la dashboard privata (/admin/seo): un'unica fonte di verità per evitare
// che i due lati si disallineino.

export interface GscQueryPageRow {
  keys: [string, string]; // [query, page]
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscDateRow {
  keys: [string]; // [data]
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscDataFile {
  generatedAt: string | null;
  period: { startDate: string; endDate: string } | null;
  totals: { clicks: number; impressions: number };
  byQueryPage: GscQueryPageRow[];
  byDate: GscDateRow[];
}

export type OpportunityPriority = "HIGH" | "MEDIUM" | "LOW";

export interface SeoOpportunity {
  query: string;
  page: string;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  priority: OpportunityPriority;
  reason: string;
  localArea: string | null;
  pageExists: boolean;
}

export interface OpportunitiesFile {
  generatedAt: string | null;
  sourceGeneratedAt: string | null;
  period: { startDate: string; endDate: string } | null;
  rules: {
    positionRange: [number, number];
    minImpressions: number;
    lowCtrThreshold: number;
    highImpressionsThreshold: number;
    mediumImpressionsThreshold: number;
  };
  opportunities: SeoOpportunity[];
}

export type InternalLinkStatus = "ORPHAN" | "POCO_COLLEGATA" | "OK";

export interface InternalLinkRoute {
  path: string;
  label: string;
  inboundContextualLinks: number;
  linkedFrom: string[];
  status: InternalLinkStatus;
}

export interface InternalLinksFile {
  generatedAt: string | null;
  note: string;
  routes: InternalLinkRoute[];
}

// Stato reale di indicizzazione (URL Inspection API), una riga per ogni
// combinazione pagina×lingua pubblicata (sitemap.ts genera la stessa lista).
export interface IndexingRow {
  url: string;
  verdict: string | null;
  coverageState: string | null;
  robotsTxtState: string | null;
  indexingState: string | null;
  pageFetchState: string | null;
  lastCrawlTime: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  sitemaps: string[];
  error: string | null;
}

export interface IndexingFile {
  generatedAt: string | null;
  siteUrl: string | null;
  rows: IndexingRow[];
}
