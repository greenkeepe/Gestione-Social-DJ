// Client minimale per la Search Console API (Search Analytics), pensato per
// autenticarsi con un Service Account (nessun consenso OAuth interattivo da
// rinnovare): vedi site/docs/seo-engine.md per come crearlo e collegarlo alla
// proprietà Search Console.
import { JWT } from "google-auth-library";

const SEARCH_ANALYTICS_ENDPOINT = (siteUrl: string) =>
  `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

export interface GscApiRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variabile d'ambiente mancante: ${name}`);
  }
  return value;
}

function loadServiceAccount(): { client_email: string; private_key: string } {
  const raw = requireEnv("GSC_SERVICE_ACCOUNT_KEY");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "GSC_SERVICE_ACCOUNT_KEY non è un JSON valido: incolla l'intero contenuto del file chiave scaricato da Google Cloud Console, senza modificarlo.",
    );
  }
  const key = parsed as { client_email?: string; private_key?: string };
  if (!key.client_email || !key.private_key) {
    throw new Error("GSC_SERVICE_ACCOUNT_KEY non contiene client_email/private_key: il file incollato non è una chiave di Service Account valida.");
  }
  return { client_email: key.client_email, private_key: key.private_key };
}

async function getAccessToken(): Promise<string> {
  const { client_email, private_key } = loadServiceAccount();
  const client = new JWT({
    email: client_email,
    key: private_key,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const { token } = await client.getAccessToken();
  if (!token) {
    throw new Error(
      "Google non ha restituito un access token. Verifica che il Service Account sia stato aggiunto come utente in Search Console (Impostazioni > Utenti e autorizzazioni).",
    );
  }
  return token;
}

export async function fetchSearchAnalytics(opts: {
  startDate: string;
  endDate: string;
  dimensions: string[];
  rowLimit?: number;
}): Promise<GscApiRow[]> {
  const siteUrl = requireEnv("GSC_SITE_URL");
  const token = await getAccessToken();

  const response = await fetch(SEARCH_ANALYTICS_ENDPOINT(siteUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: opts.startDate,
      endDate: opts.endDate,
      dimensions: opts.dimensions,
      rowLimit: opts.rowLimit ?? 1000,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Search Console API ha risposto ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { rows?: GscApiRow[] };
  return data.rows ?? [];
}
