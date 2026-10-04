import { NextResponse } from "next/server";
import { leggiDatiRepo, aggiornaDatiSuPercorso } from "../../../../../lib/dataSource";
import type { SeoProposalsFile } from "../../../../../lib/types";

export const runtime = "nodejs";

const PROPOSTE_PATH = "site/data/seo/seo-proposte.json";
const MESSAGES_IT_PATH = "site/messages/it.json";

// Applica DAVVERO una proposta di titolo/meta description nel sito: scrive
// direttamente in site/messages/it.json (mai un altro file, mai un'altra
// lingua) e solo dopo segna la proposta come "applicata". Il body può
// contenere titleFinale/descriptionFinale per applicare un testo diverso da
// quello proposto (l'utente l'ha modificato prima di premere "Applica");
// se assenti si usa il testo proposto così com'è.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  let titleFinale: string | undefined;
  let descriptionFinale: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    titleFinale = typeof body.titleFinale === "string" ? body.titleFinale.trim() : undefined;
    descriptionFinale = typeof body.descriptionFinale === "string" ? body.descriptionFinale.trim() : undefined;
  } catch {
    // body assente/non valido: si usa il testo proposto originale
  }

  try {
    const proposteFile = await leggiDatiRepo<SeoProposalsFile>(PROPOSTE_PATH);
    const proposta = proposteFile.proposte.find((p) => p.id === params.id);
    if (!proposta) {
      return NextResponse.json({ error: "Proposta non trovata." }, { status: 404 });
    }
    if (proposta.status !== "proposta") {
      return NextResponse.json({ error: `Proposta già ${proposta.status}, non applicabile di nuovo.` }, { status: 409 });
    }

    const titoloDaApplicare = titleFinale || proposta.titleProposto;
    const descrizioneDaApplicare = proposta.metaDescriptionKey ? descriptionFinale || proposta.descriptionProposta || "" : null;
    if (!titoloDaApplicare) {
      return NextResponse.json({ error: "Titolo mancante." }, { status: 400 });
    }

    // 1) Scrive davvero il nuovo titolo/meta nel sito.
    await aggiornaDatiSuPercorso<Record<string, Record<string, string>>>(
      MESSAGES_IT_PATH,
      (attuale) => {
        const namespace = attuale[proposta.metaNamespace];
        if (!namespace) throw new Error(`Namespace "${proposta.metaNamespace}" non trovato in messages/it.json.`);
        namespace[proposta.metaTitleKey] = titoloDaApplicare;
        if (proposta.metaDescriptionKey && descrizioneDaApplicare) {
          namespace[proposta.metaDescriptionKey] = descrizioneDaApplicare;
        }
        return attuale;
      },
      `chore(seo): applica titolo/meta proposto per "${proposta.pageLabel}"`
    );

    // 2) Solo se lo step 1 è andato a buon fine, segna la proposta come
    // applicata (con il testo REALMENTE scritto, non necessariamente quello
    // proposto in origine se l'utente l'ha modificato prima di applicare).
    try {
      await aggiornaDatiSuPercorso<SeoProposalsFile>(
        PROPOSTE_PATH,
        (attuale) => {
          const p = attuale.proposte.find((x) => x.id === params.id);
          if (p) {
            p.status = "applicata";
            p.decisoIl = new Date().toISOString();
            p.titleProposto = titoloDaApplicare;
            if (p.metaDescriptionKey) p.descriptionProposta = descrizioneDaApplicare;
          }
          return attuale;
        },
        `chore(seo): segna applicata la proposta per "${proposta.pageLabel}"`
      );
    } catch (err) {
      // Il sito è già stato aggiornato correttamente: questo è solo un
      // problema di stato nello storico proposte, da sistemare a mano.
      return NextResponse.json(
        { ok: true, avviso: `Titolo/meta applicati sul sito, ma l'aggiornamento dello stato della proposta è fallito: ${String(err)}` },
        { status: 200 }
      );
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
