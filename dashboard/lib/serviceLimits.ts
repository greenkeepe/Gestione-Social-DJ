import { leggiDati } from "./dataSource";

interface ServiceLimitsFile {
  servizi: {
    r2: { pausatoIl: string | null };
  };
}

// Controllato prima di accettare un nuovo media (Telegram o dashboard):
// l'Agente Analista misura periodicamente lo spazio reale usato su R2 e
// imposta questo flag se si supera la soglia scelta nella pagina "Utilizzo
// servizi" — evita di continuare a caricare file quando lo spazio gratuito
// è quasi esaurito.
export async function r2Pausato(): Promise<boolean> {
  try {
    const limiti = await leggiDati<ServiceLimitsFile>("service-limits.json");
    return limiti.servizi.r2.pausatoIl !== null;
  } catch {
    return false; // file non ancora esistente/leggibile: non blocchiamo mai per questo
  }
}
