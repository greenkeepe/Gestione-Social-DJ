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

export type CategoriaLocale = "location-eventi" | "castello" | "agriturismo" | "hotel" | "restaurant";

export interface LocaleTrovato {
  osmId: string;
  nome: string;
  categoria: CategoriaLocale;
  sitoWeb: string;
  indirizzo: string | null;
}

// Parole che in Italia compaiono tipicamente nel nome di posti adatti a
// matrimoni/eventi (ville, casali, tenute...) — usate per filtrare
// ristoranti/hotel/agriturismi generici (categorie troppo ampie per essere
// prese tutte: la maggior parte non fa eventi), MAI per le categorie già
// dedicate agli eventi (events_venue, castle), che passano senza bisogno di
// parola chiave nel nome.
const PAROLE_CHIAVE_EVENTI = "villa|tenuta|casale|castello|dimora|relais|resort|borgo|masseria|convento|abbazia|fattoria|cascina|palazzo|residenza";

// Cerca location con un sito web pubblico entro il raggio indicato, dando
// priorità a categorie OSM realmente orientate a matrimoni/eventi invece
// che a "ristorante qualsiasi" o "hotel qualsiasi" (la maggior parte non fa
// eventi, da qui il filtro): location per eventi dedicate (amenity=
// events_venue) e castelli passano sempre; agriturismi/ristoranti/hotel
// passano solo se il nome richiama una location da eventi (vedi
// PAROLE_CHIAVE_EVENTI) — OSM non ha un tag affidabile "fa matrimoni",
// quindi resta un'euristica, non una garanzia: la selezione fine resta a
// chi rivede le bozze prima di inviarle.
// "out center N" limita la risposta a N risultati (con centro calcolato
// anche per i poligoni, non solo per i punti) — evita risposte enormi su
// raggi larghi che coprono più città.
export async function cercaLocaliVicini(centro: Coordinate, raggioMetri: number, limite = 300): Promise<LocaleTrovato[]> {
  // Su OpenStreetMap il sito web di un locale è salvato a volte come
  // "website", a volte come "contact:website": niente filtro sul tag esatto
  // (primo tentativo) escludeva chi usa il secondo; nessun filtro affatto
  // (secondo tentativo) fa esplodere il costo della query su un raggio di
  // 150km e va in timeout dal lato server Overpass. La via giusta è questo
  // filtro con chiave a regex — [~"chiave"~"valore"] — che riconosce
  // ENTRAMBE le varianti del tag già lato server, restando comunque leggero.
  const filtroSito = `[~"^(website|contact:website)$"~"."]`;
  const filtroNomeEventi = `["name"~"${PAROLE_CHIAVE_EVENTI}",i]`;
  const attorno = `(around:${raggioMetri},${centro.lat},${centro.lon})`;
  const query = `[out:json][timeout:60];
(
  node["amenity"="events_venue"]${filtroSito}${attorno};
  way["amenity"="events_venue"]${filtroSito}${attorno};
  node["historic"="castle"]${filtroSito}${attorno};
  way["historic"="castle"]${filtroSito}${attorno};
  node["tourism"="guest_house"]${filtroSito}${filtroNomeEventi}${attorno};
  way["tourism"="guest_house"]${filtroSito}${filtroNomeEventi}${attorno};
  node["amenity"="restaurant"]${filtroSito}${filtroNomeEventi}${attorno};
  way["amenity"="restaurant"]${filtroSito}${filtroNomeEventi}${attorno};
  node["tourism"="hotel"]${filtroSito}${filtroNomeEventi}${attorno};
  way["tourism"="hotel"]${filtroSito}${filtroNomeEventi}${attorno};
);
out center ${limite};`;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(60000)
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
    let categoria: CategoriaLocale;
    if (tags.amenity === "events_venue") categoria = "location-eventi";
    else if (tags.historic === "castle") categoria = "castello";
    else if (tags.tourism === "guest_house") categoria = "agriturismo";
    else if (tags.amenity === "restaurant") categoria = "restaurant";
    else categoria = "hotel";
    risultati.push({
      osmId: `${el.type}/${el.id}`,
      nome: tags.name,
      categoria,
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
