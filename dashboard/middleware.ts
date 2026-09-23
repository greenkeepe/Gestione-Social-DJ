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
    pathname.startsWith("/api/r2-file")
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
