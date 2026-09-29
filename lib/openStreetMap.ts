// Ricerca locali che fanno eventi (location, ville, castelli, discoteche,
// stabilimenti, agriturismi, ristoranti/bar/hotel con eventi) nell'area
// scelta, usando OpenStreetMap: gratuito, nessuna chiave API, nessun account.
//
// Storia: la query precedente filtrava sito web e nome (regex senza
// maiuscole/minuscole) direttamente sul server Overpass e andava in timeout
// o 504 su TUTTI i server pubblici (provato dal vivo il 2026-09-29), per
// giorni di fila. Ora la query chiede solo tag esatti in un raggio (pochi
// secondi) e i filtri si fanno qui; in più si riprova su più server con una
// pausa quando rispondono "occupato" (429/504).
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
];
const USER_AGENT = "GestioneSocialDJ/1.0 (+https://github.com/greenkeepe/Gestione-Social-DJ)";

export interface Coordinate {
  lat: number;
  lon: number;
}

const attendi = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function nominatim(params: Record<string, string>): Promise<Coordinate | null> {
  const url = new URL(NOMINATIM_URL);
  for (const [k, v] of Object.entries({ format: "json", limit: "1", countrycodes: "it", ...params })) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return null;
  const json = (await res.json()) as Array<{ lat: string; lon: string }>;
  return json.length ? { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) } : null;
}

// Centro di una città/paese italiano. Prima come "città" (altrimenti per
// "Alessandria" Nominatim restituisce il centro della PROVINCIA, a 15 km dalla
// città), poi come ricerca libera. null se non trovata: meglio saltare una
// zona che cercare nel posto sbagliato.
export async function geocodificaCitta(nome: string): Promise<Coordinate | null> {
  try {
    return (await nominatim({ city: nome })) ?? (await attendi(1100), await nominatim({ q: nome }));
  } catch {
    return null;
  }
}

// Variante con posizione di riserva (usata per la sede in config/brand.json).
export async function geocodifica(indirizzo: string, fallback: Coordinate): Promise<Coordinate> {
  try {
    return (await nominatim({ q: indirizzo })) ?? fallback;
  } catch {
    return fallback;
  }
}

export type CategoriaLocale =
  | "location-eventi" | "castello" | "villa" | "discoteca" | "stabilimento" | "agriturismo"
  | "hotel" | "restaurant" | "bar";

// Categorie che fanno eventi per definizione: passano sempre. Le altre
// (ristoranti, bar, hotel) solo se il nome o il sito parlano di eventi.
export const CATEGORIE_EVENTI = new Set<CategoriaLocale>(["location-eventi", "castello", "villa", "discoteca", "stabilimento", "agriturismo"]);

export interface LocaleTrovato {
  osmId: string;
  nome: string;
  categoria: CategoriaLocale;
  sitoWeb: string;
  emailOsm: string | null;
  indirizzo: string | null;
  nomeDaEventi: boolean; // il nome richiama una location da eventi (villa, tenuta, ricevimenti...)
}

// Parole che nel NOME indicano un posto da eventi/matrimoni.
const NOME_DA_EVENTI = /villa|tenuta|casale|castello|dimora|relais|resort|borgo|masseria|convento|abbazia|fattoria|cascina|palazzo|residenza|agriturismo|ricevimenti|banchetti|banqueting|eventi|events|location|lounge|disco|beach|bagni|lido/i;

function categoriaDa(t: Record<string, string>): CategoriaLocale | null {
  if (t.amenity === "events_venue") return "location-eventi";
  if (t.historic === "castle") return "castello";
  if (t.historic === "manor" || t.historic === "villa") return "villa";
  if (t.amenity === "nightclub" || t.leisure === "dance") return "discoteca";
  if (t.leisure === "beach_resort") return "stabilimento";
  if (t.tourism === "guest_house" && /agri|farm/i.test(t.guest_house ?? "")) return "agriturismo";
  if (t.tourism === "chalet" || t.tourism === "guest_house") return NOME_DA_EVENTI.test(t.name ?? "") ? "agriturismo" : "hotel";
  if (t.tourism === "hotel") return "hotel";
  if (t.amenity === "restaurant") return "restaurant";
  if (t.amenity === "bar" || t.amenity === "pub") return "bar";
  return null;
}

// Tutti i locali potenzialmente interessanti nel raggio, con sito web o email.
export async function cercaLocaliVicini(centro: Coordinate, raggioMetri: number): Promise<LocaleTrovato[]> {
  const a = `(around:${Math.round(raggioMetri)},${centro.lat.toFixed(5)},${centro.lon.toFixed(5)})`;
  const query = `[out:json][timeout:50];
(
  nwr["amenity"~"^(events_venue|restaurant|nightclub|bar|pub)$"]${a};
  nwr["tourism"~"^(hotel|guest_house|chalet)$"]${a};
  nwr["historic"~"^(castle|manor|villa)$"]["name"]${a};
  nwr["leisure"~"^(beach_resort|dance)$"]${a};
);
out tags center;`;

  interface RispostaOverpass {
    elements: Array<{ type: string; id: number; tags?: Record<string, string> }>;
  }

  let ultimoErrore: unknown = null;
  let json: RispostaOverpass | null = null;
  // 2 giri sui server, con pausa quando rispondono "occupato"
  giri: for (let giro = 0; giro < 2; giro++) {
    for (const url of OVERPASS_URLS) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(60000)
        });
        if (!res.ok) {
          ultimoErrore = new Error(`Overpass (${new URL(url).host}) ha risposto ${res.status}`);
          if (res.status === 429 || res.status === 504) await attendi(15000);
          continue;
        }
        json = (await res.json()) as RispostaOverpass;
        break giri;
      } catch (err) {
        ultimoErrore = err;
      }
    }
    await attendi(30000);
  }
  if (!json) throw ultimoErrore instanceof Error ? ultimoErrore : new Error(String(ultimoErrore));

  const risultati: LocaleTrovato[] = [];
  for (const el of json.elements) {
    const t = el.tags;
    if (!t?.name) continue;
    const categoria = categoriaDa(t);
    if (!categoria) continue;
    const sitoWeb = t.website || t["contact:website"] || t.url || "";
    const emailOsm = pulisciEmail(t.email || t["contact:email"] || "");
    if (!sitoWeb && !emailOsm) continue;
    const indirizzoParti = [t["addr:street"], t["addr:housenumber"], t["addr:city"]].filter(Boolean);
    risultati.push({
      osmId: `${el.type}/${el.id}`,
      nome: t.name,
      categoria,
      sitoWeb,
      emailOsm,
      indirizzo: indirizzoParti.length > 0 ? indirizzoParti.join(" ") : null,
      nomeDaEventi: NOME_DA_EVENTI.test(t.name)
    });
  }
  return risultati;
}

// ---------- Email ----------
// Falsi positivi tipici degli scanner di email (sistemi dei costruttori di
// siti, monitoraggio errori), caselle PEC (non leggono posta normale) e
// indirizzi automatici.
const DOMINI_DA_IGNORARE = ["wixpress.com", "sentry.io", "sentry-next.wixpress.com", "godaddy.com", "example.com", "schema.org", "w3.org", "domain.com", "email.com", "sitename.com", "yourdomain.com"];
const PEC = /(^|\.)(pec|legalmail|postacert|arubapec|pecimprese|cert)\./i; // sul dominio
// Enti pubblici (comuni, ministero per i castelli/forti statali, scuole,
// diocesi): non sono locali a cui proporre un DJ.
const ENTE_PUBBLICO = /(^|\.)(comune|regione|provincia|citta\s?metropolitana|beniculturali|cultura|istruzione|diocesi|chiesacattolica|parrocchia|asl|gov)\.|\.gov\.it$|\.edu$/i;
const LOCALE_DA_IGNORARE = /^(no-?reply|noreply|donotreply|privacy|dpo|gdpr|webmaster|admin|postmaster|abuse|amministrazione|fatture|fatturazione)$/i;
const ESTENSIONI_FILE = /\.(png|jpe?g|gif|webp|svg|css|js|ico|pdf)$/i;
const PROVIDER_COMUNI = /(^|\.)(gmail|googlemail|libero|hotmail|outlook|live|yahoo|icloud|me|alice|tim|virgilio|tiscali|fastwebnet|email|tin|inwind|iol|msn)\.(com|it|net)$/i;
const REGEX_EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function pulisciEmail(grezza: string): string | null {
  const email = grezza.split(/[;,\s]/)[0]?.replace(/^mailto:/i, "").trim().toLowerCase() ?? "";
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) return null;
  const [locale, dominio] = email.split("@");
  if (ESTENSIONI_FILE.test(email) || PEC.test(dominio) || ENTE_PUBBLICO.test(dominio) || LOCALE_DA_IGNORARE.test(locale)) return null;
  if (DOMINI_DA_IGNORARE.some((d) => dominio.endsWith(d))) return null;
  return email;
}

const dominioBase = (host: string) => host.toLowerCase().replace(/^www\./, "").split(".").slice(-2).join(".");

// Email più affidabile tra quelle trovate: stesso dominio del sito, poi una
// casella di un provider comune (gmail, libero...). Un dominio estraneo
// (spesso quello di chi ha fatto il sito, o spam) viene scartato.
export function scegliEmail(candidate: string[], sitoWeb: string): string | null {
  let host = "";
  try { host = new URL(sitoWeb.startsWith("http") ? sitoWeb : `https://${sitoWeb}`).hostname; } catch { /* sito non valido */ }
  const pulite = [...new Set(candidate.map(pulisciEmail).filter((e): e is string => Boolean(e)))];
  const stessoDominio = pulite.filter((e) => host && dominioBase(e.split("@")[1]) === dominioBase(host));
  const ordina = (l: string[]) => l.sort((a, b) => Number(!/^(info|eventi|events|booking|prenotazioni|contatti|hello|ciao)@/.test(a)) - Number(!/^(info|eventi|events|booking|prenotazioni|contatti|hello|ciao)@/.test(b)));
  return ordina(stessoDominio)[0] ?? ordina(pulite.filter((e) => PROVIDER_COMUNI.test(e.split("@")[1])))[0] ?? null;
}

// Parole che sul SITO indicano che il locale organizza/ospita eventi.
const SITO_DA_EVENTI = /matrimon|ricevimen|banchett|cerimoni|eventi|evento|feste|festa privata|serat[ae]|dj set|\bdj\b|musica dal vivo|live music|aperitivo in musica|compleann|comunion|battesim|party|wedding|banqueting|sala per|sale per|location/i;

export interface ContattoSito {
  email: string | null;
  faEventi: boolean;
}

// Legge la home e un paio di pagine "contatti"/"eventi" del sito: cerca
// l'email pubblica e se il locale parla di eventi. Nessuna libreria di
// scraping: fetch + ricerca nel testo. Mai un'email inventata.
export async function analizzaSito(sitoWeb: string): Promise<ContattoSito> {
  let origine: string;
  try {
    origine = new URL(sitoWeb.startsWith("http") ? sitoWeb : `https://${sitoWeb}`).origin;
  } catch {
    return { email: null, faEventi: false };
  }
  const trovate: string[] = [];
  let faEventi = false;
  const percorsi = ["/", "/contatti", "/contatti/", "/contact", "/contacts", "/it/contatti", "/eventi", "/events"];
  let pagineLette = 0;
  for (const percorso of percorsi) {
    try {
      const res = await fetch(`${origine}${percorso}`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8000), redirect: "follow" });
      if (!res.ok) { if (percorso === "/") break; continue; } // home non raggiungibile: inutile insistere
      const html = (await res.text()).slice(0, 1_500_000);
      pagineLette++;
      trovate.push(...(html.match(REGEX_EMAIL) ?? []));
      if (!faEventi) faEventi = SITO_DA_EVENTI.test(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " "));
      if (faEventi && scegliEmail(trovate, sitoWeb) && pagineLette >= 1) break;
    } catch {
      if (percorso === "/") break;
    }
  }
  return { email: scegliEmail(trovate, sitoWeb), faEventi };
}
