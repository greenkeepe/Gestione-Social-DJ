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
  };
}

// Modifica la soglia di R2 (pagina "Utilizzo servizi") e/o forza la ripresa
// del caricamento dopo una pausa automatica — utile subito dopo aver
// liberato spazio, senza aspettare il prossimo giro dell'Agente Analista
// (che comunque la rimetterebbe in pausa da solo se lo spazio è ancora sopra soglia).
export async function PATCH(req: Request) {
  const body = (await req.json()) as { limiteBytes?: number; sogliaPercentualePausa?: number; riprendi?: boolean };

  try {
    await aggiornaDatiSuGitHub<ServiceLimitsFile>(
      "service-limits.json",
      (attuale) => {
        const r2 = attuale.servizi.r2;
        if (typeof body.limiteBytes === "number" && body.limiteBytes > 0) r2.limiteBytes = body.limiteBytes;
        if (typeof body.sogliaPercentualePausa === "number" && body.sogliaPercentualePausa > 0 && body.sogliaPercentualePausa <= 100) {
          r2.sogliaPercentualePausa = body.sogliaPercentualePausa;
        }
        if (body.riprendi) r2.pausatoIl = null;
        return attuale;
      },
      "chore(utilizzo): aggiorna soglie servizi"
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
