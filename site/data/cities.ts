// Pagine locali "DJ a <città>" (app/[locale]/dj/[citta]/page.tsx), solo in
// italiano: servono a chi cerca su Google "DJ matrimonio Genova", "dj set
// Alessandria"... Ogni città ha un testo proprio (niente pagine fotocopia,
// che Google penalizza). Solo fatti veri: base a Serravalle Scrivia (AL),
// tempi di viaggio indicativi ("circa"), tipi di location tipici della zona;
// mai location specifiche citate come se ci fosse già stato un evento.
//
// Titolo e meta description stanno in messages/it.json > CittaPages
// (<chiave>MetaTitle / <chiave>MetaDescription), così il motore SEO può
// proporne versioni migliori e la dashboard applicarle come per le altre pagine.
//
// Per aggiungere una città: una nuova voce qui + le due chiavi in it.json.

export interface Citta {
  slug: string; // URL: /dj/<slug>
  chiave: string; // prefisso delle chiavi in messages/it.json > CittaPages
  nome: string;
  provincia: string;
  regione: string;
  distanza: string; // da Serravalle Scrivia, indicativa
  heroTitle: string;
  heroDescription: string;
  intro: string[]; // paragrafi
  location: string[]; // tipi di location tipici della zona
  zoneVicine: string[];
  faq: { question: string; answer: string }[];
}

const RISPOSTA_PREZZO =
  "Non ho un listino fisso: ogni evento è diverso e location, orari e servizi richiesti cambiano il prezzo giusto. Raccontami data, location e tipo di evento e ti mando un preventivo reale, di solito entro poche ore e senza impegno.";

const RISPOSTA_IMPIANTO =
  "Sì: porto io impianto audio professionale, luci scenografiche ed effetti fumo. Il montaggio e la preparazione tecnica richiedono meno di un'ora e lavoro sempre in accordo con la location e lo staff dell'evento.";

export const cities: Citta[] = [
  {
    slug: "genova",
    chiave: "genova",
    nome: "Genova",
    provincia: "GE",
    regione: "Liguria",
    distanza: "circa 45 minuti",
    heroTitle: "DJ A GENOVA PER MATRIMONI, FESTE ED EVENTI",
    heroDescription:
      "Dj set su misura, impianto audio e luci per matrimoni, feste private ed eventi a Genova e in tutta la Liguria.",
    intro: [
      "Genova e la Liguria sono tra le zone in cui lavoro più volentieri: dalle ville storiche sulle alture della città alle location affacciate sul mare, ogni evento qui ha un'atmosfera tutta sua, e la musica deve seguirla.",
      "Con la base a Serravalle Scrivia sono a circa 45 minuti da Genova, lungo l'A7: raggiungo facilmente sia il centro sia le due Riviere, per matrimoni, feste private, compleanni, aperitivi in musica ed eventi aziendali.",
      "Ogni serata la costruisco insieme a voi: dalla musica per la cerimonia e l'aperitivo fino al dj set che fa ballare tutti a fine cena, leggendo la pista in tempo reale.",
    ],
    location: [
      "Ville storiche e giardini sulle alture di Genova",
      "Location sul mare e terrazze panoramiche",
      "Stabilimenti balneari e beach club per feste ed eventi estivi",
      "Ristoranti, locali e sale per feste private ed eventi aziendali",
    ],
    zoneVicine: ["Nervi", "Recco", "Camogli", "Rapallo", "Chiavari", "Arenzano", "Varazze", "Busalla"],
    faq: [
      {
        question: "Lavori anche a Genova e in Riviera?",
        answer:
          "Sì: da Serravalle Scrivia sono a circa 45 minuti da Genova e raggiungo sia la Riviera di Levante sia quella di Ponente, per matrimoni, feste private ed eventi aziendali.",
      },
      { question: "Quanto costa un DJ per un matrimonio a Genova?", answer: RISPOSTA_PREZZO },
      { question: "Porti tu impianto audio e luci?", answer: RISPOSTA_IMPIANTO },
      {
        question: "Puoi fare un sopralluogo nella location prima dell'evento?",
        answer:
          "Sì, quando serve fisso volentieri un breve sopralluogo nella location, così da conoscere spazi, orari e staff e preparare tutto senza sorprese il giorno dell'evento.",
      },
    ],
  },
  {
    slug: "alessandria",
    chiave: "alessandria",
    nome: "Alessandria",
    provincia: "AL",
    regione: "Piemonte",
    distanza: "circa 30 minuti",
    heroTitle: "DJ AD ALESSANDRIA PER MATRIMONI ED EVENTI",
    heroDescription:
      "Musica su misura, impianto audio e luci per matrimoni, feste ed eventi ad Alessandria e in tutta la provincia.",
    intro: [
      "La provincia di Alessandria è casa mia: la mia base è a Serravalle Scrivia, a circa 30 minuti dal capoluogo, e qui conosco bene il territorio, dalle colline del Monferrato alle cascine della pianura.",
      "Ad Alessandria e dintorni lavoro per matrimoni, compleanni, feste private, eventi aziendali e serate nei locali, con un servizio completo: dj set, impianto audio professionale, luci ed effetti.",
      "Ogni evento parte da una chiacchierata: mi raccontate cosa vi piace, cosa non volete sentire e l'atmosfera che immaginate, e io costruisco la colonna sonora della giornata.",
    ],
    location: [
      "Castelli e dimore storiche della provincia",
      "Cascine e agriturismi tra pianura e colline del Monferrato",
      "Ville con parco e sale ricevimenti",
      "Locali, ristoranti e spazi per feste private ed eventi aziendali",
    ],
    zoneVicine: ["Valenza", "Casale Monferrato", "Castellazzo Bormida", "Spinetta Marengo", "Solero", "Felizzano", "Bosco Marengo"],
    faq: [
      {
        question: "Lavori ad Alessandria e in provincia?",
        answer:
          "Sì: la mia base è a Serravalle Scrivia, in provincia di Alessandria, a circa 30 minuti dal capoluogo. Lavoro in tutta la provincia, dal Monferrato alla Val Borbera.",
      },
      { question: "Quanto costa un DJ per un matrimonio ad Alessandria?", answer: RISPOSTA_PREZZO },
      { question: "Porti tu impianto audio e luci?", answer: RISPOSTA_IMPIANTO },
      {
        question: "Suoni anche per feste private e compleanni?",
        answer:
          "Certo: oltre ai matrimoni lavoro per compleanni, feste private, eventi aziendali e serate nei locali, adattando musica e impianto al tipo di evento e allo spazio.",
      },
    ],
  },
  {
    slug: "novi-ligure",
    chiave: "noviLigure",
    nome: "Novi Ligure",
    provincia: "AL",
    regione: "Piemonte",
    distanza: "circa 10 minuti",
    heroTitle: "DJ A NOVI LIGURE PER MATRIMONI E FESTE",
    heroDescription:
      "Dj set, impianto audio e luci per matrimoni, feste private ed eventi a Novi Ligure, nel Gaviese e dintorni.",
    intro: [
      "Novi Ligure è a circa 10 minuti dalla mia base di Serravalle Scrivia: praticamente sotto casa. Per chi organizza un evento qui significa un DJ che conosce la zona, facile da incontrare prima e sempre puntuale il giorno della festa.",
      "Tra Novi, le colline del Gavi e i paesi vicini ci sono tenute, cascine e ville perfette per matrimoni e feste: porto un servizio completo, dalla musica per la cerimonia al dj set di fine serata, con impianto audio e luci.",
      "Lavoro anche per compleanni, feste private, eventi aziendali e serate nei locali: ogni volta la musica è pensata su chi c'è in pista, non su una playlist standard.",
    ],
    location: [
      "Tenute vinicole e cascine sulle colline del Gavi",
      "Ville con giardino e sale ricevimenti",
      "Agriturismi della zona",
      "Locali e ristoranti per feste private ed eventi",
    ],
    zoneVicine: ["Gavi", "Pozzolo Formigaro", "Basaluzzo", "Pasturana", "Francavilla Bisio", "Serravalle Scrivia", "Cassano Spinola"],
    faq: [
      {
        question: "Quanto sei distante da Novi Ligure?",
        answer:
          "Circa 10 minuti: la mia base è a Serravalle Scrivia. Per Novi e il Gaviese ci si può incontrare facilmente prima dell'evento per preparare tutto insieme.",
      },
      { question: "Quanto costa un DJ per un matrimonio a Novi Ligure?", answer: RISPOSTA_PREZZO },
      { question: "Porti tu impianto audio e luci?", answer: RISPOSTA_IMPIANTO },
      {
        question: "Possiamo incontrarci prima dell'evento?",
        answer:
          "Sì: essendo vicini è facile vedersi di persona per parlare di musica, orari e momenti importanti, e se serve fare un sopralluogo nella location.",
      },
    ],
  },
  {
    slug: "tortona",
    chiave: "tortona",
    nome: "Tortona",
    provincia: "AL",
    regione: "Piemonte",
    distanza: "circa 25 minuti",
    heroTitle: "DJ A TORTONA PER MATRIMONI ED EVENTI",
    heroDescription:
      "Musica su misura, impianto audio e luci per matrimoni, feste ed eventi a Tortona e sui Colli Tortonesi.",
    intro: [
      "Tortona e i Colli Tortonesi sono a circa 25 minuti dalla mia base di Serravalle Scrivia: una zona di colline, vigneti e agriturismi che si presta benissimo a matrimoni e feste all'aperto.",
      "Qui porto un servizio completo per matrimoni, compleanni, feste private ed eventi aziendali: musica per ogni momento della giornata, impianto audio professionale, luci ed effetti per la festa.",
      "La scaletta non è mai fissa: la costruiamo insieme prima dell'evento e poi, la sera, la adatto in tempo reale a chi sta ballando.",
    ],
    location: [
      "Agriturismi e cascine sui Colli Tortonesi",
      "Tenute vinicole tra i vigneti",
      "Ville e dimore storiche della zona",
      "Ristoranti e sale per feste private ed eventi aziendali",
    ],
    zoneVicine: ["Viguzzolo", "Castelnuovo Scrivia", "Volpedo", "Sale", "Pontecurone", "Villaromagnano", "Garbagna"],
    faq: [
      {
        question: "Lavori a Tortona e sui Colli Tortonesi?",
        answer:
          "Sì: da Serravalle Scrivia sono a circa 25 minuti da Tortona e lavoro in tutta la zona dei Colli Tortonesi, anche nelle location di campagna.",
      },
      { question: "Quanto costa un DJ per un matrimonio a Tortona?", answer: RISPOSTA_PREZZO },
      { question: "Porti tu impianto audio e luci?", answer: RISPOSTA_IMPIANTO },
      {
        question: "Puoi suonare anche per un evento all'aperto?",
        answer:
          "Sì: per gli eventi all'aperto porto l'impianto adatto allo spazio e mi coordino con la location su corrente, orari e volumi, così tutto funziona senza intoppi.",
      },
    ],
  },
  {
    slug: "serravalle-scrivia",
    chiave: "serravalleScrivia",
    nome: "Serravalle Scrivia",
    provincia: "AL",
    regione: "Piemonte",
    distanza: "è la mia base",
    heroTitle: "DJ A SERRAVALLE SCRIVIA PER MATRIMONI E FESTE",
    heroDescription:
      "La mia base: dj set, impianto audio e luci per matrimoni, feste private ed eventi a Serravalle Scrivia e in Val Borbera.",
    intro: [
      "Serravalle Scrivia è la mia base: da qui parto per tutti gli eventi in Piemonte, Liguria e Lombardia. Per chi organizza una festa in paese o nei dintorni vuol dire un DJ di casa, facile da incontrare e senza trasferte lunghe.",
      "Lavoro per matrimoni, compleanni, feste private, eventi aziendali e serate nei locali, con un servizio completo: musica su misura, impianto audio professionale, luci ed effetti.",
      "Dalla Val Borbera alle colline del Gavi, conosco location e spazi della zona e so come adattare impianto e musica a ogni tipo di evento.",
    ],
    location: [
      "Ville, cascine e agriturismi tra Val Scrivia e Val Borbera",
      "Location sulle colline del Gavi",
      "Ristoranti e locali per feste private",
      "Spazi per eventi aziendali e feste all'aperto",
    ],
    zoneVicine: ["Arquata Scrivia", "Stazzano", "Vignole Borbera", "Gavi", "Cassano Spinola", "Novi Ligure", "Borghetto di Borbera"],
    faq: [
      {
        question: "Dove ti trovi esattamente?",
        answer:
          "La mia base è a Serravalle Scrivia, in provincia di Alessandria. Da qui lavoro in un raggio di circa 150 km, tra Piemonte, Liguria e Lombardia.",
      },
      { question: "Quanto costa un DJ per una festa a Serravalle Scrivia?", answer: RISPOSTA_PREZZO },
      { question: "Porti tu impianto audio e luci?", answer: RISPOSTA_IMPIANTO },
      {
        question: "Possiamo vederci di persona?",
        answer:
          "Certo: per gli eventi in zona è facile incontrarsi prima per parlare di musica, momenti importanti e orari, e se serve visitare insieme la location.",
      },
    ],
  },
  {
    slug: "acqui-terme",
    chiave: "acquiTerme",
    nome: "Acqui Terme",
    provincia: "AL",
    regione: "Piemonte",
    distanza: "circa 50 minuti",
    heroTitle: "DJ AD ACQUI TERME PER MATRIMONI ED EVENTI",
    heroDescription:
      "Dj set su misura, impianto audio e luci per matrimoni, feste ed eventi ad Acqui Terme e nell'Alto Monferrato.",
    intro: [
      "Acqui Terme e l'Alto Monferrato sono una delle zone più belle per un matrimonio: colline, vigneti, ville e agriturismi immersi nella campagna. Dalla mia base di Serravalle Scrivia ci arrivo in circa 50 minuti.",
      "Qui lavoro per matrimoni, feste private, compleanni ed eventi aziendali con un servizio completo: musica per la cerimonia, l'aperitivo e la cena, dj set per la festa, impianto audio professionale e luci.",
      "Prima dell'evento costruiamo insieme la scaletta, momento per momento; la sera la adatto a chi c'è in pista, perché ogni festa ha il suo ritmo.",
    ],
    location: [
      "Ville e dimore storiche tra le colline dell'Alto Monferrato",
      "Agriturismi e cascine tra i vigneti",
      "Tenute vinicole per ricevimenti all'aperto",
      "Ristoranti e sale per feste private ed eventi",
    ],
    zoneVicine: ["Strevi", "Visone", "Ovada", "Nizza Monferrato", "Cassine", "Bistagno", "Rivalta Bormida"],
    faq: [
      {
        question: "Lavori anche ad Acqui Terme e nell'Alto Monferrato?",
        answer:
          "Sì: da Serravalle Scrivia sono a circa 50 minuti da Acqui Terme e lavoro in tutta la zona, da Ovada a Nizza Monferrato.",
      },
      { question: "Quanto costa un DJ per un matrimonio ad Acqui Terme?", answer: RISPOSTA_PREZZO },
      { question: "Porti tu impianto audio e luci?", answer: RISPOSTA_IMPIANTO },
      {
        question: "Suoni anche in location di campagna?",
        answer:
          "Sì: per ville, agriturismi e tenute porto l'impianto adatto allo spazio, all'aperto o al chiuso, e mi coordino con la location su corrente, orari e volumi.",
      },
    ],
  },
];

export function trovaCitta(slug: string): Citta | undefined {
  return cities.find((c) => c.slug === slug);
}
