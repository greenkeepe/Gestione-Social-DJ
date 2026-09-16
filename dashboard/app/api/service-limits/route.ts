import { NextResponse } from "next/server";
import { aggiornaDatiSuGitHub } from "../../../lib/dataSource";

export const runtime = "nodejs";

interface ServiceLimitsFile {
  _istruzioni: string;
  servizi: {
    r2: {
      nome: string;
      limiteBytes: number;
      sogliaPercentualePausa: number;
      usoAttualeBytes: number;
      oggettiAttuali: number;
      aggiornatoIl: string | null;
      pausatoIl: string | null;
    };
    anthropic: {
      nome: string;
      limiteChiamateMese: number;
      sogliaPercentualePausa: number;
      chiamateEffettuateMese: number;
      meseCorrente: string;
      aggiornatoIl: string | null;
      pausatoIl: string | null;
    };
  };
}

// Modifica la soglia di R2 o Anthropic (pagina "Utilizzo servizi") e/o forza
// la ripresa dopo una pausa automatica — utile subito dopo aver liberato
// spazio/alzato il tetto, senza aspettare il prossimo giro dell'agente
// interessato (che comunque la rimetterebbe in pausa da solo se si è ancora
// sopra soglia).
export async function PATCH(req: Request) {
  const body = (await req.json()) as {
    servizio?: "r2" | "anthropic";
    limiteBytes?: number;
    limiteChiamateMese?: number;
    sogliaPercentualePausa?: number;
    riprendi?: boolean;
  };
  const servizio = body.servizio === "anthropic" ? "anthropic" : "r2";

  try {
    await aggiornaDatiSuGitHub<ServiceLimitsFile>(
      "service-limits.json",
      (attuale) => {
        if (servizio === "r2") {
          const r2 = attuale.servizi.r2;
          if (typeof body.limiteBytes === "number" && body.limiteBytes > 0) r2.limiteBytes = body.limiteBytes;
          if (typeof body.sogliaPercentualePausa === "number" && body.sogliaPercentualePausa > 0 && body.sogliaPercentualePausa <= 100) {
            r2.sogliaPercentualePausa = body.sogliaPercentualePausa;
          }
          if (body.riprendi) r2.pausatoIl = null;
        } else {
          const anthropic = attuale.servizi.anthropic;
          if (typeof body.limiteChiamateMese === "number" && body.limiteChiamateMese > 0) anthropic.limiteChiamateMese = body.limiteChiamateMese;
          if (typeof body.sogliaPercentualePausa === "number" && body.sogliaPercentualePausa > 0 && body.sogliaPercentualePausa <= 100) {
            anthropic.sogliaPercentualePausa = body.sogliaPercentualePausa;
          }
          if (body.riprendi) anthropic.pausatoIl = null;
        }
        return attuale;
      },
      `chore(utilizzo): aggiorna soglie servizio ${servizio}`
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
