import { NextResponse } from "next/server";
import { NOME_COOKIE } from "../../../lib/session";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url), { status: 303 });
  res.cookies.delete(NOME_COOKIE);
  return res;
}
