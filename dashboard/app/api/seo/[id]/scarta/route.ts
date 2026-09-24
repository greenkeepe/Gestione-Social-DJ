import { NextResponse } from "next/server";
import { aggiornaDatiSuPercorso } from "../../../../../lib/dataSource";
import type { SeoProposalsFile } from "../../../../../lib/types";

export const runtime = "nodejs";

const PROPOSTE_PATH = "site/data/seo/seo-proposte.json";

// Scarta una proposta senza applicarla: resta nello storico come
// "scartata", propose-fixes.ts non ne genera una nuova per la stessa
// pagina finché non emerge un'opportunità diversa (vedi il controllo in
// quello script: solo una proposta attiva per pagina alla volta).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await aggiornaDatiSuPercorso<SeoProposalsFile>(
      PROPOSTE_PATH,
      (attuale) => {
        const p = attuale.proposte.find((x) => x.id === params.id);
        if (p) {
          p.status = "scartata";
          p.decisoIl = new Date().toISOString();
        }
        return attuale;
      },
      `chore(seo): scarta proposta ${params.id}`
    );
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
