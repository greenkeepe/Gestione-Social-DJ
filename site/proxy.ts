// Protegge la dashboard privata /admin/seo con Basic Auth. Non tocca nessuna
// altra rotta del sito pubblico. Vedi site/docs/seo-engine.md per come
// impostare ADMIN_SEO_USER / ADMIN_SEO_PASSWORD.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: "/admin/:path*",
};

export function proxy(request: NextRequest) {
  const expectedUser = process.env.ADMIN_SEO_USER;
  const expectedPassword = process.env.ADMIN_SEO_PASSWORD;

  // Se le credenziali non sono configurate, blocca per sicurezza invece di
  // lasciare la dashboard aperta per errore di configurazione.
  if (!expectedUser || !expectedPassword) {
    return new Response("Area riservata non configurata: imposta ADMIN_SEO_USER e ADMIN_SEO_PASSWORD.", {
      status: 503,
    });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice("Basic ".length), "base64").toString("utf-8");
    const separatorIndex = decoded.indexOf(":");
    const suppliedUser = decoded.slice(0, separatorIndex);
    const suppliedPassword = decoded.slice(separatorIndex + 1);
    if (suppliedUser === expectedUser && suppliedPassword === expectedPassword) {
      return NextResponse.next();
    }
  }

  return new Response("Autenticazione richiesta.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Area riservata SEO"' },
  });
}
