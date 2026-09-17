import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint diagnostico TEMPORANEO: dice solo se le variabili META_* sono
// presenti sul deployment live e quanto sono lunghe, senza mai mostrarne
// il valore — serve a capire se il problema è "Vercel non le vede" o
// "il valore incollato è sbagliato" senza dover esporre i secret in chat.
// Protetto come ogni altra rotta dal middleware della dashboard (serve login).
function stato(nome: string): { presente: boolean; lunghezza: number } {
  const valore = process.env[nome];
  return { presente: Boolean(valore), lunghezza: valore?.length ?? 0 };
}

export async function GET() {
  return NextResponse.json({
    META_APP_ID: stato("META_APP_ID"),
    META_APP_SECRET: stato("META_APP_SECRET"),
    META_PAGE_ID: stato("META_PAGE_ID"),
    META_PAGE_ACCESS_TOKEN: stato("META_PAGE_ACCESS_TOKEN"),
    GITHUB_TOKEN: stato("GITHUB_TOKEN"),
    GITHUB_REPO: stato("GITHUB_REPO")
  });
}
