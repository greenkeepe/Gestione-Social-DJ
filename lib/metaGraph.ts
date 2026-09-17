// Client minimale per Meta Graph API (Facebook Pages + Instagram Graph API).
// Documentazione: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
const GRAPH_VERSION = "v21.0";
const BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variabile d'ambiente mancante: ${name}. Vedi .env.example.`);
  return v;
}

async function graphFetch<T>(path: string, params: Record<string, string>, method: "GET" | "POST" = "GET"): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  const token = requireEnv("META_PAGE_ACCESS_TOKEN");
  const body = new URLSearchParams({ ...params, access_token: token });

  const res = method === "GET"
    ? await fetch(`${url.toString()}?${body.toString()}`)
    : await fetch(url.toString(), { method: "POST", body });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Graph API error [${path}]: ${JSON.stringify(json)}`);
  }
  return json as T;
}

// --- Pubblicazione Instagram (foto singola, carosello, reel) --------------
// Il flusso Instagram richiede due passi: 1) creare un "media container"
// puntando all'URL pubblico del file, 2) pubblicarlo.
export async function pubblicaSuInstagram(opts: {
  imageUrl?: string;
  videoUrl?: string;
  isReel?: boolean;
  caption: string;
}): Promise<{ id: string }> {
  const igUserId = requireEnv("META_IG_BUSINESS_ACCOUNT_ID");

  const containerParams: Record<string, string> = { caption: opts.caption };
  if (opts.videoUrl) {
    containerParams.media_type = opts.isReel ? "REELS" : "VIDEO";
    containerParams.video_url = opts.videoUrl;
  } else if (opts.imageUrl) {
    containerParams.image_url = opts.imageUrl;
  } else {
    throw new Error("Serve imageUrl o videoUrl per pubblicare su Instagram");
  }

  const container = await graphFetch<{ id: string }>(`/${igUserId}/media`, containerParams, "POST");

  // Aspetta che Meta finisca di elaborare il container prima di pubblicare:
  // serve sempre, non solo per i video. Le foto di solito risultano già
  // "FINISHED" al primo controllo (quindi nessun ritardo percepibile), ma
  // sotto carico possono restare per un momento "IN_PROGRESS" — pubblicare
  // subito in quel caso dà l'errore Meta "Media ID is not available".
  await attendiElaborazioneContainer(container.id);

  const pubblicato = await graphFetch<{ id: string }>(
    `/${igUserId}/media_publish`,
    { creation_id: container.id },
    "POST"
  );
  return pubblicato;
}

async function attendiElaborazioneContainer(containerId: string, tentativiMax = 20): Promise<void> {
  for (let i = 0; i < tentativiMax; i++) {
    const status = await graphFetch<{ status_code: string }>(`/${containerId}`, { fields: "status_code" });
    if (status.status_code === "FINISHED") return;
    if (status.status_code === "ERROR") throw new Error(`Elaborazione media Instagram fallita (container ${containerId})`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Timeout in attesa dell'elaborazione del media Instagram (container ${containerId})`);
}

// --- Pubblicazione Instagram Stories -----------------------------------------
// Stesso flusso a due passi dei post/reel ma con media_type=STORIES: contenuto
// effimero (sparisce dopo 24h), nessuna didascalia (l'API Stories non supporta
// testo sovrapposto). Pensato per tenere il profilo "vivo" tra un post
// principale e l'altro senza affollare il feed né diluire l'engagement dei
// post veri: le Stories non hanno un limite pratico di frequenza consigliata
// come i post.
export async function pubblicaStoriesSuInstagram(opts: { imageUrl?: string; videoUrl?: string }): Promise<{ id: string }> {
  const igUserId = requireEnv("META_IG_BUSINESS_ACCOUNT_ID");

  const containerParams: Record<string, string> = { media_type: "STORIES" };
  if (opts.videoUrl) {
    containerParams.video_url = opts.videoUrl;
  } else if (opts.imageUrl) {
    containerParams.image_url = opts.imageUrl;
  } else {
    throw new Error("Serve imageUrl o videoUrl per pubblicare una Storia Instagram");
  }

  const container = await graphFetch<{ id: string }>(`/${igUserId}/media`, containerParams, "POST");
  // Stesso motivo di pubblicaSuInstagram: aspetta SEMPRE il container
  // "FINISHED", non solo per i video — sotto carico anche un'immagine può
  // restare "IN_PROGRESS" per un momento (visto in un test reale).
  await attendiElaborazioneContainer(container.id);
  return graphFetch<{ id: string }>(`/${igUserId}/media_publish`, { creation_id: container.id }, "POST");
}

// --- Pubblicazione Facebook Page -------------------------------------------
export async function pubblicaSuFacebook(opts: { message: string; imageUrl?: string; videoUrl?: string }): Promise<{ id: string }> {
  const pageId = requireEnv("META_PAGE_ID");
  if (opts.videoUrl) {
    return graphFetch(`/${pageId}/videos`, { file_url: opts.videoUrl, description: opts.message }, "POST");
  }
  if (opts.imageUrl) {
    return graphFetch(`/${pageId}/photos`, { url: opts.imageUrl, caption: opts.message }, "POST");
  }
  return graphFetch(`/${pageId}/feed`, { message: opts.message }, "POST");
}

// --- Insights (per Analytics Agent) -----------------------------------------
export async function leggiInsightsAccountInstagram(): Promise<Record<string, unknown>> {
  const igUserId = requireEnv("META_IG_BUSINESS_ACCOUNT_ID");
  return graphFetch(`/${igUserId}`, {
    fields: "followers_count,media_count"
  });
}

export async function leggiUsernameAccountInstagram(): Promise<string> {
  const igUserId = requireEnv("META_IG_BUSINESS_ACCOUNT_ID");
  const res = await graphFetch<{ username: string }>(`/${igUserId}`, { fields: "username" });
  return res.username;
}

export async function leggiInsightsPost(postId: string): Promise<Record<string, unknown>> {
  return graphFetch(`/${postId}/insights`, { metric: "impressions,reach,likes,comments,saved,shares" });
}

// --- Commenti/menzioni in entrata (per Leads Agent) -------------------------
// Solo interazioni IN ENTRATA da chi ha già interagito con i nostri contenuti
// (mai ricerca/contatto di sconosciuti che non ci hanno scritto per primi).
export async function leggiCommentiRecenti(mediaId: string): Promise<Array<{ id: string; username: string; text: string; timestamp: string }>> {
  const res = await graphFetch<{ data: Array<{ id: string; username: string; text: string; timestamp: string }> }>(
    `/${mediaId}/comments`,
    { fields: "username,text,timestamp" }
  );
  return res.data;
}

export async function leggiUltimiMediaInstagram(limit = 10): Promise<Array<{ id: string; timestamp: string; caption?: string; permalink?: string }>> {
  const igUserId = requireEnv("META_IG_BUSINESS_ACCOUNT_ID");
  const res = await graphFetch<{ data: Array<{ id: string; timestamp: string; caption?: string; permalink?: string }> }>(`/${igUserId}/media`, {
    fields: "id,timestamp,caption,permalink",
    limit: String(limit)
  });
  return res.data;
}

// --- Risposta pubblica a un commento (per Agente Portavoce) -----------------
// Risponde SOTTO al post, in pubblico — diverso da un DM privato. È un
// segnale di conversazione attiva che l'algoritmo di Instagram considera
// nel decidere quanto mostrare un post anche a chi non segue ancora.
export async function rispondiCommento(commentId: string, message: string): Promise<{ id: string }> {
  return graphFetch(`/${commentId}/replies`, { message }, "POST");
}
