// Misura (locale, senza credenziali extra) di quante chiamate all'API
// Anthropic vengono fatte ogni mese, per la pagina dashboard "Utilizzo
// servizi": Anthropic non offre un piano gratuito con un tetto misurabile
// come R2, è a consumo puro, quindi qui non "misuriamo" uno spazio reale ma
// contiamo le chiamate e mettiamo in pausa (torna ai template gratuiti, zero
// ulteriore costo) quando superano la soglia scelta. Si azzera da solo a ogni
// cambio di mese.
import { readData, writeData, nowIso } from "./storage.js";
import { inviaMessaggioTelegram } from "./telegram.js";

interface ServiceLimitsFile {
  servizi: {
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

function meseAttuale(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

async function leggiConReset(): Promise<{ file: ServiceLimitsFile; anthropic: ServiceLimitsFile["servizi"]["anthropic"] }> {
  const file = await readData<ServiceLimitsFile>("service-limits.json");
  const anthropic = file.servizi.anthropic;
  const mese = meseAttuale();
  if (anthropic.meseCorrente !== mese) {
    // nuovo mese: si riparte da zero, ed eventuali pause del mese scorso non hanno più senso
    anthropic.meseCorrente = mese;
    anthropic.chiamateEffettuateMese = 0;
    anthropic.pausatoIl = null;
  }
  return { file, anthropic };
}

export async function anthropicPausato(): Promise<boolean> {
  try {
    const { anthropic } = await leggiConReset();
    return anthropic.pausatoIl !== null;
  } catch {
    return false; // file non ancora leggibile: non blocchiamo mai per questo
  }
}

// Chiamata a ogni chiamata riuscita all'API Anthropic: aggiorna il contatore
// e, se supera la soglia scelta in dashboard, mette in pausa l'uso dell'LLM
// (le didascalie tornano ai template scritti a mano, zero costo) fino al
// mese prossimo o finché non alzi la soglia/riprendi manualmente da dashboard.
export async function registraChiamataAnthropic(): Promise<void> {
  try {
    const { file, anthropic } = await leggiConReset();
    anthropic.chiamateEffettuateMese += 1;
    anthropic.aggiornatoIl = nowIso();

    const percentuale = (anthropic.chiamateEffettuateMese / anthropic.limiteChiamateMese) * 100;
    if (percentuale >= anthropic.sogliaPercentualePausa && !anthropic.pausatoIl) {
      anthropic.pausatoIl = nowIso();
      await inviaMessaggioTelegram(
        `⚠️ Chiamate Anthropic al ${percentuale.toFixed(0)}% del limite mensile (soglia ${anthropic.sogliaPercentualePausa}%): da ora le didascalie tornano ai template gratuiti fino al mese prossimo (o finché non alzi la soglia dalla pagina "Utilizzo servizi").`
      );
    }

    await writeData("service-limits.json", file);
  } catch (err) {
    console.error("[anthropicUsage] impossibile registrare la chiamata:", err);
  }
}
