import { NextResponse, type NextRequest } from "next/server";
import { NOME_COOKIE, tokenValido } from "./lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/telegram-webhook")
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
