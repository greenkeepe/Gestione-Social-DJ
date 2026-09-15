// Sessione minimale "a costo zero": un cookie firmato con HMAC-SHA256,
// niente database di sessioni. Sufficiente per un uso personale (un solo
// utente, la dashboard del DJ) protetto da password.
const COOKIE_NAME = "gsdj_session";
const PAYLOAD = "authenticated";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET non impostato: vedi dashboard/.env.example");
  return secret;
}

async function firma(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Buffer.from(sig).toString("hex");
}

export async function creaTokenSessione(): Promise<string> {
  const firma_ = await firma(PAYLOAD);
  return `${PAYLOAD}.${firma_}`;
}

export async function tokenValido(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [payload, firmaRicevuta] = token.split(".");
  if (payload !== PAYLOAD || !firmaRicevuta) return false;
  const firmaAttesa = await firma(PAYLOAD);
  return firmaAttesa === firmaRicevuta;
}

export const NOME_COOKIE = COOKIE_NAME;
