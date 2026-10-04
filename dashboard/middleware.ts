import { NextResponse, type NextRequest } from "next/server";
import { NOME_COOKIE, tokenValido } from "./lib/session";

// Nota: /api/r2-file è pubblico (vedi eccezione sotto) perché Meta
// scarica i media dei post da lì con una richiesta anonima.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/telegram-webhook") ||
    // Deve restare raggiungibile senza autenticazione: è l'endpoint da cui
    // Meta (Instagram/Facebook) scarica i media dei post da pubblicare, una
    // richiesta anonima che non ha mai il cookie di sessione della
    // dashboard. Senza questa eccezione il middleware la reindirizzava a
    // /login, e Meta riceveva la pagina di login HTML al posto del file
    // (root cause reale, trovata dal vivo, di ogni "formato non
    // supportato"/"file corrotto" visto oggi: l'header di risposta
    // "x-matched-path: /login" lo confermava).
    pathname.startsWith("/api/r2-file") ||
    // Stesso identico bug, stessa correzione: Vercel Cron (vedi
    // dashboard/vercel.json) chiama questi endpoint con una richiesta
    // anonima, mai col cookie di sessione — senza questa eccezione veniva
    // reindirizzata a /login e la route non partiva mai. Trovato dal vivo:
    // zero esecuzioni registrate per l'Agente Invio Automatico Locali
    // nonostante fosse attivo, e il cron di daily-agents.yml aveva lo
    // stesso identico problema. La sicurezza qui non dipende dal
    // middleware: ogni route sotto /api/cron verifica da sé l'header
    // "Authorization: Bearer CRON_SECRET" che solo Vercel conosce.
    pathname.startsWith("/api/cron/")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(NOME_COOKIE)?.value;
  const valido = await tokenValido(token);
  if (!valido) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
