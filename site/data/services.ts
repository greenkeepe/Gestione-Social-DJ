// Servizi confermati in config/brand.json (servizi_extra + attività descritta in bio).
// Nessun servizio non confermato è stato aggiunto.

export type ServiceItem = {
  slug: string;
  title: string;
  description: string;
  icon: "disc" | "speaker" | "sparkles" | "flame" | "mic" | "music" | "users";
};

export const services: ServiceItem[] = [
  {
    slug: "dj-set",
    title: "DJ set",
    description:
      "Consolle curata dall'inizio alla fine da un unico professionista, con selezione musicale costruita sul pubblico presente in tempo reale.",
    icon: "disc",
  },
  {
    slug: "impianto-audio",
    title: "Impianto audio professionale",
    description:
      "Sistema audio dimensionato sulla location e sul numero di invitati, per un suono pulito in ogni ambiente.",
    icon: "speaker",
  },
  {
    slug: "luci",
    title: "Luci",
    description:
      "Disegno luci pensato per accompagnare i momenti della serata, dall'atmosfera del ricevimento all'energia del party.",
    icon: "sparkles",
  },
  {
    slug: "macchina-del-fumo",
    title: "Macchina del fumo",
    description: "Un tocco scenico in più nei momenti clou della pista da ballo.",
    icon: "flame",
  },
  {
    slug: "microfoni-cerimonia",
    title: "Microfoni per interventi e cerimonia",
    description:
      "Audio dedicato a discorsi, brindisi e momenti parlati, coordinato con la musica della cerimonia.",
    icon: "mic",
  },
  {
    slug: "coordinamento-musicale",
    title: "Coordinamento musicale dell'evento",
    description:
      "Playlist costruita su misura con un incontro di pianificazione prima dell'evento, dalla cerimonia al fine serata.",
    icon: "music",
  },
];

// Generi musicali confermati in config/brand.json (generi[]).
export const musicGenres = [
  "Commerciale",
  "Anni 70/80/90",
  "Latino",
  "Dance",
  "Pop",
  "Rock",
  "R&B/Soul",
  "Lounge",
];

// Punti di forza confermati in config/brand.json (puntiDiForza[]).
export const strengths = [
  "DJ set curato interamente da un unico professionista, dall'inizio alla fine della serata",
  "Repertorio vastissimo e sempre aggiornato: dagli anni '70/80/90 al pop, rock, dance, latino e lounge",
  "Grande capacità di leggere la pista e adattare la musica al pubblico presente",
  "Esperienza in location come relais, ristoranti, club house e golf club",
  "Playlist costruita su misura insieme ai clienti, con incontro di pianificazione prima dell'evento",
  "Montaggio e smontaggio rapido dell'attrezzatura",
];
