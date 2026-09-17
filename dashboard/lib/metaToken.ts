// Controllo scadenza del Page Access Token Facebook/Instagram, lato
// dashboard (Vercel) — separato dagli agenti (GitHub Actions) perché qui
// serve poter interagire con l'utente (redirect di login Facebook), cosa
// che un workflow automatico schedulato non può fare da solo.
const GRAPH_VERSION = "v21.0";
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface StatoTokenMeta {
  configurato: boolean;
  valido: boolean;
  permanente: boolean;
  scadeIl: string | null; // ISO, null se permanente o sconosciuto
  errore: string | null;
}

export async function controllaTokenMeta(): Promise<StatoTokenMeta> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!appId || !appSecret || !token) {
    return { configurato: false, valido: false, permanente: false, scadeIl: null, errore: null };
  }

  try {
    const url = new URL(`${GRAPH_BASE}/debug_token`);
    url.searchParams.set("input_token", token);
    url.searchParams.set("access_token", `${appId}|${appSecret}`);
    const res = await fetch(url.toString(), { cache: "no-store" });
    const json = (await res.json()) as {
      data?: { is_valid?: boolean; expires_at?: number };
      error?: { message: string };
    };
    if (!res.ok || json.error) {
      return { configurato: true, valido: false, permanente: false, scadeIl: null, errore: json.error?.message ?? `Errore ${res.status}` };
    }
    const scadenza = json.data?.expires_at;
    const permanente = !scadenza || scadenza === 0;
    return {
      configurato: true,
      valido: json.data?.is_valid ?? false,
      permanente,
      scadeIl: permanente ? null : new Date(scadenza! * 1000).toISOString(),
      errore: null
    };
  } catch (err) {
    return { configurato: true, valido: false, permanente: false, scadeIl: null, errore: err instanceof Error ? err.message : String(err) };
  }
}

// Stessi permessi già usati per ottenere il token attuale (vedi README >
// "Rinnovo token Facebook/Instagram").
export const SCOPE_META =
  "pages_show_list,business_management,instagram_basic,instagram_manage_comments,instagram_content_publish,instagram_manage_messages,pages_read_engagement,pages_manage_posts,public_profile";
