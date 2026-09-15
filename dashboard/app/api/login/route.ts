import { NextResponse } from "next/server";
import { NOME_COOKIE, creaTokenSessione } from "../../../lib/session";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");

  if (password !== process.env.DASHBOARD_PASSWORD) {
    const url = new URL("/login?errore=1", req.url);
    return NextResponse.redirect(url, { status: 303 });
  }

  const token = await creaTokenSessione();
  const res = NextResponse.redirect(new URL("/", req.url), { status: 303 });
  res.cookies.set(NOME_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/"
  });
  return res;
}
