// Ricerca locali (ristoranti/hotel con sito web) nell'area servita, usando
// OpenStreetMap: gratuito, nessuna chiave API, nessun account da creare —
// coerente con il resto del sistema a costo zero. Limite reale da tenere
// presente: OSM non segna in modo affidabile quali locali "fanno eventi",
// quindi il filtro qui sotto è solo "ristorante o hotel con un sito web
// pubblico" — la selezione fine (è un posto adatto?) resta a chi rivede le
// bozze prima di inviarle.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "GestioneSocialDJ/1.0 (+https://github.com/greenkeepe/Gestione-Social-DJ)";

export interface Coordinate {
  lat: number;
  lon: number;
}

// Geocodifica la base dell'area servita (es. "Serravalle Scrivia (AL)") in
// coordinate, per poi cercare intorno a quel punto. Se Nominatim non
// risponde (rate limit, down), ricade su una posizione approssimativa
// nota di default invece di far fallire tutto l'agente.
export async function geocodifica(indirizzo: string, fallback: Coordinate): Promise<Coordinate> {
  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", indirizzo);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (json.length === 0) return fallback;
    return { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) };
  } catch {
    return fallback;
  }
}

export interface LocaleTrovato {
  osmId: string;
  nome: string;
  categoria: "restaurant" | "hotel";
  sitoWeb: string;
  indirizzo: string | null;
}

// Cerca ristoranti/hotel con un sito web pubblico entro il raggio indicato.
// "out center N" limita la risposta a N risultati (con centro calcolato
// anche per i poligoni, non solo per i punti) — evita risposte enormi su
// raggi larghi che coprono più città.
export async function cercaLocaliVicini(centro: Coordinate, raggioMetri: number, limite = 300): Promise<LocaleTrovato[]> {
  // Niente filtro ["website"] qui: su OpenStreetMap il sito a volte è salvato
  // come "website", a volte come "contact:website" — meglio prendere tutti i
  // ristoranti/hotel con un nome e filtrare per la presenza di UNO dei due
  // tag dopo, lato codice (vedi sotto), altrimenti si escludono metà dei
  // locali veri solo per una differenza di tag.
  const query = `[out:json][timeout:25];
(
  node["amenity"="restaurant"]["name"](around:${raggioMetri},${centro.lat},${centro.lon});
  way["amenity"="restaurant"]["name"](around:${raggioMetri},${centro.lat},${centro.lon});
  node["tourism"="hotel"]["name"](around:${raggioMetri},${centro.lat},${centro.lon});
  way["tourism"="hotel"]["name"](around:${raggioMetri},${centro.lat},${centro.lon});
);
out center ${limite};`;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(30000)
  });
  if (!res.ok) {
    throw new Error(`Overpass API ha risposto ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    elements: Array<{
      type: string;
      id: number;
      tags?: Record<string, string>;
    }>;
  };

  const risultati: LocaleTrovato[] = [];
  for (const el of json.elements) {
    const tags = el.tags;
    const sitoWeb = tags?.website || tags?.["contact:website"];
    if (!tags?.name || !sitoWeb) continue;
    const indirizzoParti = [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]].filter(Boolean);
    risultati.push({
      osmId: `${el.type}/${el.id}`,
      nome: tags.name,
      categoria: tags.amenity === "restaurant" ? "restaurant" : "hotel",
      sitoWeb,
      indirizzo: indirizzoParti.length > 0 ? indirizzoParti.join(" ") : null
    });
  }
  return risultati;
}

// Domini che compaiono spesso come falsi positivi negli scanner di regex
// email (indirizzi di sistema di siti fatti con Wix/GoDaddy/ecc., o
// indirizzi di monitoraggio errori), da scartare se trovati.
const DOMINI_DA_IGNORARE = ["wixpress.com", "sentry.io", "godaddy.com", "example.com", "schema.org", "w3.org"];

const REGEX_EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function primaEmailValida(testo: string): string | null {
  const trovate = testo.match(REGEX_EMAIL) ?? [];
  for (const email of trovate) {
    const dominio = email.split("@")[1]?.toLowerCase();
    if (dominio && !DOMINI_DA_IGNORARE.some((d) => dominio.endsWith(d))) {
      return email;
    }
  }
  return null;
}

// Prova a trovare un'email pubblica sul sito del locale: prima la home
// page, poi un paio di percorsi "contatti" comuni. Nessuna libreria di
// scraping pesante: solo fetch + ricerca del pattern email nell'HTML
// grezzo (cattura anche i link "mailto:"). Ritorna null se non trova
// nulla — quel locale viene semplicemente saltato, mai inventata un'email.
export async function trovaEmailSulSito(sitoWeb: string): Promise<string | null> {
  let origine: string;
  try {
    const url = new URL(sitoWeb.startsWith("http") ? sitoWeb : `https://${sitoWeb}`);
    origine = url.origin;
  } catch {
    return null;
  }

  const percorsi = ["/", "/contatti", "/contatti/", "/contact", "/contact/", "/it/contatti"];
  for (const percorso of percorsi) {
    try {
      const res = await fetch(`${origine}${percorso}`, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) continue;
      const html = await res.text();
      const email = primaEmailValida(html);
      if (email) return email;
    } catch {
      continue; // sito lento/irraggiungibile su questo percorso: prova il successivo
    }
  }
  return null;
}
