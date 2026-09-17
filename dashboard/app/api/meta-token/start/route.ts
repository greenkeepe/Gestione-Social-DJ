import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { SCOPE_META } from "../../../../lib/metaToken";

export const runtime = "nodejs";

// Avvia il login Facebook per rinnovare il Page Access Token: redirect alla
// finestra di consenso di Meta con gli stessi permessi già usati oggi.
// Protetto dal middleware della dashboard come ogni altra pagina (serve
// essere loggati per arrivarci).
export async function GET(req: Request) {
  const appId = process.env.META_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: "META_APP_ID non configurato su Vercel." }, { status: 500 });
  }

  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/meta-token/callback`;
  const state = randomBytes(16).toString("hex");

  const dialogUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  dialogUrl.searchParams.set("client_id", appId);
  dialogUrl.searchParams.set("redirect_uri", redirectUri);
  dialogUrl.searchParams.set("scope", SCOPE_META);
  dialogUrl.searchParams.set("response_type", "code");
  dialogUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(dialogUrl.toString());
  res.cookies.set("meta_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
