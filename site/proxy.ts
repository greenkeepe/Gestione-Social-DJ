// Due responsabilità distinte in un solo proxy (Next.js permette un solo
// file proxy.ts):
// 1. /admin/*: Basic Auth per la dashboard privata (vedi site/docs/seo-engine.md).
// 2. Tutto il resto: instradamento multilingua (next-intl) — rileva la
//    lingua del visitatore (cookie salvato, poi header Accept-Language) e
//    serve /en, /fr, /de con prefisso; l'italiano resta senza prefisso per
//    non toccare gli URL già indicizzati da Google.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};

function checkAdminAuth(request: NextRequest): Response {
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

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    return checkAdminAuth(request);
  }
  return intlMiddleware(request);
}
