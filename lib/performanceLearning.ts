// Impara dai post già pubblicati quali pilastri editoriali e quali hashtag
// portano più interazione reale, e li fa "pesare" di più nelle scelte
// future — senza mai eliminare del tutto le opzioni con meno dati (niente
// overfitting, resta sempre varietà nei contenuti). Finché non c'è
// abbastanza storico misurato, il sistema resta casuale come è sempre stato.
export interface InsightsPost {
  impressions?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  saved?: number;
  shares?: number;
}

// Salvataggi e condivisioni pesano più dei like: sono i segnali che
// l'algoritmo di Instagram usa di più per mostrare un contenuto anche a chi
// non segue ancora l'account (coerente con le CTA "salva"/"segui" già
// presenti nelle didascalie — vedi agents/content-agent.ts).
export function calcolaPunteggio(insights: InsightsPost): number {
  const like = insights.likes ?? 0;
  const commenti = insights.comments ?? 0;
  const salvati = insights.saved ?? 0;
  const condivisioni = insights.shares ?? 0;
  return like + commenti * 2 + salvati * 3 + condivisioni * 3;
}

export interface VoceLogPerformance {
  pillarId?: string | null;
  hashtags?: string[];
  punteggio?: number | null;
}

// Sotto questa soglia di post già misurati, i dati sono troppo pochi per
// significare qualcosa: si resta sul comportamento casuale di sempre.
const CAMPIONI_MINIMI = 8;

// Anche con dati abbondanti, un'opzione non scende mai sotto il 30% della
// probabilità che avrebbe con la scelta puramente casuale: evita che il
// sistema si richiuda sempre sulle stesse 2-3 opzioni migliori.
const PAVIMENTO = 0.3;

function mediePerChiave(voci: VoceLogPerformance[], chiaviDi: (v: VoceLogPerformance) => string[]): Map<string, { somma: number; conteggio: number }> {
  const mappa = new Map<string, { somma: number; conteggio: number }>();
  for (const v of voci) {
    if (v.punteggio == null) continue;
    for (const chiave of chiaviDi(v)) {
      const attuale = mappa.get(chiave) ?? { somma: 0, conteggio: 0 };
      attuale.somma += v.punteggio;
      attuale.conteggio += 1;
      mappa.set(chiave, attuale);
    }
  }
  return mappa;
}

// Sceglie N opzioni (senza ripetizioni) pesando per il punteggio medio
// storico di ciascuna. Con meno di CAMPIONI_MINIMI post già misurati, o
// senza dati per nessuna opzione, si comporta esattamente come una pesca
// casuale uniforme (il comportamento originale, prima di questa funzione).
export function campionaPesato<T>(
  opzioni: T[],
  n: number,
  chiaveDi: (o: T) => string,
  voci: VoceLogPerformance[],
  chiaviVoceDi: (v: VoceLogPerformance) => string[]
): T[] {
  if (opzioni.length === 0) return [];
  const quanti = Math.min(n, opzioni.length);

  const campioniMisurati = voci.filter((v) => v.punteggio != null).length;
  if (campioniMisurati < CAMPIONI_MINIMI) {
    return [...opzioni].sort(() => Math.random() - 0.5).slice(0, quanti);
  }

  const medie = mediePerChiave(voci, chiaviVoceDi);
  const grezzi = opzioni.map((o) => medie.get(chiaveDi(o))?.somma);
  const conteggi = opzioni.map((o) => medie.get(chiaveDi(o))?.conteggio ?? 0);
  const medieOpzioni = grezzi.map((somma, i) => (somma != null && conteggi[i] > 0 ? somma / conteggi[i] : null));
  const pesoMassimo = Math.max(...medieOpzioni.filter((p): p is number => p != null), 1);

  const rimanenti = [...opzioni];
  let pesiRimanenti = medieOpzioni.map((p) => PAVIMENTO + (1 - PAVIMENTO) * ((p ?? 0) / pesoMassimo));

  const scelti: T[] = [];
  for (let k = 0; k < quanti; k++) {
    const totale = pesiRimanenti.reduce((a, b) => a + b, 0);
    let soglia = Math.random() * totale;
    let indice = pesiRimanenti.length - 1;
    for (let i = 0; i < pesiRimanenti.length; i++) {
      soglia -= pesiRimanenti[i];
      if (soglia <= 0) {
        indice = i;
        break;
      }
    }
    scelti.push(rimanenti[indice]);
    rimanenti.splice(indice, 1);
    pesiRimanenti.splice(indice, 1);
  }
  return scelti;
}
