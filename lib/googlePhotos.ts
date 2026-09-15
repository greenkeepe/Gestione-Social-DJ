// Client minimale per Google Photos Library API, limitato all'album dedicato
// (GOOGLE_PHOTOS_ALBUM_ID) che l'utente crea e popola manualmente sul telefono.
// Usa un refresh token OAuth ottenuto una tantum (vedi README, sezione setup).
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://photoslibrary.googleapis.com/v1";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variabile d'ambiente mancante: ${name}. Vedi .env.example.`);
  return v;
}

async function ottieniAccessToken(): Promise<string> {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
    refresh_token: requireEnv("GOOGLE_REFRESH_TOKEN"),
    grant_type: "refresh_token"
  });
  const res = await fetch(TOKEN_URL, { method: "POST", body: params });
  if (!res.ok) throw new Error(`Impossibile ottenere access token Google: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export interface MediaItemGooglePhotos {
  id: string;
  filename: string;
  mimeType: string;
  baseUrl: string;
  mediaMetadata: { creationTime: string; photo?: unknown; video?: unknown };
}

export async function elencaMediaAlbum(): Promise<MediaItemGooglePhotos[]> {
  const accessToken = await ottieniAccessToken();
  const albumId = requireEnv("GOOGLE_PHOTOS_ALBUM_ID");

  const res = await fetch(`${API_BASE}/mediaItems:search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ albumId, pageSize: 100 })
  });
  if (!res.ok) throw new Error(`Errore lettura album Google Photos: ${await res.text()}`);
  const json = (await res.json()) as { mediaItems?: MediaItemGooglePhotos[] };
  return json.mediaItems ?? [];
}

// baseUrl di Google Photos scade dopo ~60 minuti: va richiesto url fresco
// e usato a breve giro (il Publishing Agent lo consuma subito dopo il Media Agent).
export function urlDownloadDiretto(item: MediaItemGooglePhotos): string {
  const isVideo = item.mimeType.startsWith("video/");
  return isVideo ? `${item.baseUrl}=dv` : `${item.baseUrl}=d`;
}
