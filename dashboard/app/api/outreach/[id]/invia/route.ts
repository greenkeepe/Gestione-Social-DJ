import { NextResponse } from "next/server";
import { leggiDati, leggiConfig, aggiornaDatiSuGitHub } from "../../../../../lib/dataSource";
import { inviaEmail } from "../../../../../lib/email";
import { firmaTesto, firmaHtml, corpoHtml, type BrandFile } from "../../../../../lib/firma";
import type { OutreachFile } from "../../../../../lib/types";

export const runtime = "nodejs";

// Invia DAVVERO l'email al locale — solo quando Andrea preme questo tasto
// dalla pagina "Locali". Un contatto alla volta, mai un invio di massa:
// la bozza è già scritta dall'Agente Esploratore, qui aggiungiamo la firma
// vera (presa da config/brand.json al momento dell'invio, non salvata
// nella bozza) e spediamo, sia in testo semplice sia in HTML con i link
// veri (telefono, email, WhatsApp, Instagram, sito).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const file = await leggiDati<OutreachFile>("outreach-locali.json");
    const contatto = file.contatti.find((c) => c.id === params.id);
    if (!contatto) return NextResponse.json({ error: "Contatto non trovato." }, { status: 404 });
    if (contatto.status !== "bozza-da-rivedere") {
      return NextResponse.json({ error: "Questo contatto non è più in attesa di revisione." }, { status: 400 });
    }

    const brand = await leggiConfig<BrandFile>("brand.json").catch(() => ({}) as BrandFile);
    const testoFinale = `${contatto.corpo}\n\n${firmaTesto(brand)}`;
    const htmlFinale = `${corpoHtml(contatto.corpo)}<br><br>${firmaHtml(brand)}`;

    await inviaEmail({ to: contatto.email, subject: contatto.oggetto, text: testoFinale, html: htmlFinale });

    await aggiornaDatiSuGitHub<OutreachFile>(
      "outreach-locali.json",
      (attuale) => {
        const c = attuale.contatti.find((x) => x.id === params.id);
        if (c) {
          c.corpo = testoFinale;
          c.status = "inviata";
          c.inviataIl = new Date().toISOString();
        }
        return attuale;
      },
      `chore(locali): email inviata a "${contatto.nomeLocale}"`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
