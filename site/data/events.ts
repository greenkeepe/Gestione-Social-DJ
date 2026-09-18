// Tipologie di evento raggruppate dalle voci confermate in
// config/brand.json (tipologieEventi[]). Nessuna categoria inventata.

export type EventCategory = {
  slug: string;
  title: string;
  short: string;
  description: string;
  includes: string[];
  imageSrc?: string;
  imageAlt?: string;
};

export const eventCategories: EventCategory[] = [
  {
    slug: "matrimoni",
    title: "Wedding",
    short: "Matrimoni e wedding party",
    description:
      "La colonna sonora dell'intera giornata: dalla cerimonia al fine serata, con musica pensata per ogni momento.",
    includes: ["Matrimoni", "Matrimoni in chiesa", "Cerimonie e comunioni"],
    imageSrc: "/images/gallery/wedding-coldspark-cake.jpg",
    imageAlt: "Taglio della torta tra i fuochi freddi",
  },
  {
    slug: "eventi-privati",
    title: "Private Events",
    short: "Compleanni, diciottesimi e feste private",
    description:
      "Feste su misura per ogni età e occasione, con energia costruita insieme agli invitati sulla pista da ballo.",
    includes: [
      "Compleanni e anniversari",
      "Diciottesimi",
      "Addio al nubilato/celibato",
      "Feste private",
    ],
    imageSrc: "/images/gallery/party-indoor-handsup.jpg",
    imageAlt: "Pista da ballo al coperto con le mani alzate",
  },
  {
    slug: "corporate",
    title: "Corporate",
    short: "Eventi aziendali e occasioni professionali",
    description:
      "Musica calibrata sull'identità del brand, dall'aperitivo di networking al momento di intrattenimento.",
    includes: ["Feste aziendali", "Ricevimenti e inaugurazioni"],
    imageSrc: "/images/gallery/events-corporate-buffet.jpg",
    imageAlt: "Console DJ durante un evento aziendale con buffet",
  },
  {
    slug: "party",
    title: "Party",
    short: "Eventi ad alta energia",
    description:
      "Serate pensate per far salire l'energia dal primo all'ultimo brano.",
    includes: ["Capodanno ed eventi stagionali", "Locali, club e bar"],
    imageSrc: "/images/gallery/party-nightclub-518.jpg",
    imageAlt: "Festa in discoteca con la pista animata",
  },
];

// Tappe del matrimonio — sezione "Wedding timeline" sulla home e su /matrimoni.
export type WeddingMoment = {
  key: string;
  title: string;
  description: string;
  imageSrc?: string;
  imageAlt?: string;
};

export const weddingMoments: WeddingMoment[] = [
  {
    key: "cerimonia",
    title: "Cerimonia",
    description: "Atmosfera e musica pensate per l'inizio della celebrazione.",
    imageSrc: "/images/gallery/wedding-ceremony-chairs.jpg",
    imageAlt: "Allestimento della cerimonia con vista sulle colline",
  },
  {
    key: "aperitivo",
    title: "Aperitivo",
    description: "Sottofondo elegante per accogliere gli invitati.",
    imageSrc: "/images/gallery/wedding-aperitivo-garden.jpg",
    imageAlt: "Aperitivo in giardino sotto la magnolia",
  },
  {
    key: "cena",
    title: "Cena",
    description: "Momenti musicali scelti con cura per accompagnare la tavola.",
  },
  {
    key: "first-dance",
    title: "First Dance",
    description: "Il primo ballo, costruito sul brano che vi rappresenta.",
    imageSrc: "/images/gallery/wedding-sparklers-dance.jpg",
    imageAlt: "Primo ballo degli sposi tra le stelle filanti",
  },
  {
    key: "party",
    title: "Party",
    description: "L'energia sale e la pista da ballo si riempie.",
    imageSrc: "/images/gallery/wedding-reception-dance.jpg",
    imageAlt: "Balli al ricevimento con luci scenografiche",
  },
  {
    key: "final-dance",
    title: "Final Dance",
    description: "Il momento che nessuno vuole veda finire.",
  },
];

// Fasi del processo — sezione "Dal primo messaggio all'ultimo ballo".
export const processSteps = [
  {
    number: "01",
    title: "Racconta il tuo evento",
    description: "Data, location, tipo di evento e atmosfera desiderata.",
  },
  {
    number: "02",
    title: "Costruiamo l'esperienza",
    description: "Musica, servizi e dettagli vengono pianificati insieme.",
  },
  {
    number: "03",
    title: "Arriva il grande giorno",
    description: "Tutto è pronto.",
  },
  {
    number: "04",
    title: "Si balla.",
    description: "L'esperienza ha inizio.",
  },
];
