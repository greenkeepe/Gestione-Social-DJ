import { z } from "zod";

export const eventTypeOptions = [
  "Matrimonio",
  "Compleanno / Diciottesimo",
  "Evento aziendale",
  "Festa privata",
  "Altro",
] as const;

export const desiredServiceOptions = [
  "DJ set",
  "Impianto audio",
  "Luci",
  "Macchina del fumo",
  "Microfoni per cerimonia",
] as const;

export const referralOptions = [
  "Instagram",
  "Facebook",
  "Musiqua",
  "Passaparola",
  "Google",
  "Altro",
] as const;

export const contactFormSchema = z.object({
  name: z.string().trim().min(2, "Inserisci il tuo nome."),
  email: z.string().trim().email("Inserisci un'email valida."),
  phone: z
    .string()
    .trim()
    .min(6, "Inserisci un numero di telefono valido.")
    .max(20, "Numero di telefono troppo lungo."),
  eventType: z.enum(eventTypeOptions, {
    message: "Seleziona il tipo di evento.",
  }),
  eventDate: z
    .string()
    .trim()
    .min(1, "Inserisci la data dell'evento.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Inserisci una data valida."),
  location: z.string().trim().max(160).optional(),
  guestCount: z.string().trim().max(20).optional(),
  desiredServices: z.array(z.enum(desiredServiceOptions)).optional().default([]),
  message: z.string().trim().max(2000).optional(),
  referral: z.enum(referralOptions).optional(),
  // Honeypot anti-spam: deve arrivare vuoto. Nome volutamente generico
  // (non "company"/"website"/ecc.) per non farlo compilare dagli
  // autofill dei browser, che altrimenti lo riempiono anche se invisibile
  // e fanno fallire la validazione a utenti reali.
  hp_field: z.string().max(0).optional().or(z.literal("")),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

// Versione ridotta per il widget "preventivo veloce": solo i campi
// indispensabili per farsi richiamare e valutare un preventivo (serve la
// location per stimare la distanza), niente nome/email.
export const quickQuoteSchema = z.object({
  eventType: z.enum(eventTypeOptions, {
    message: "Seleziona il tipo di evento.",
  }),
  eventDate: z
    .string()
    .trim()
    .min(1, "Inserisci la data (anche indicativa).")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Inserisci una data valida."),
  location: z
    .string()
    .trim()
    .min(2, "Inserisci la località dell'evento.")
    .max(160, "Nome località troppo lungo."),
  phone: z
    .string()
    .trim()
    .min(6, "Inserisci un numero di telefono valido.")
    .max(20, "Numero di telefono troppo lungo."),
  // Honeypot anti-spam: vedi commento su contactFormSchema.hp_field.
  hp_field: z.string().max(0).optional().or(z.literal("")),
});

export type QuickQuoteValues = z.infer<typeof quickQuoteSchema>;

// --- Wedding Music Planner (/questionario-sposi) ----------------------------
// Basato sul modulo Google Form storico ("Wedding Music Planner - FORTEDJ"),
// semplificato su richiesta di Andrea: un solo contatto (email+telefono di
// chi compila, non uno a testa), niente social, e i campi della cerimonia
// compaiono solo se rispondono di averla in loco — altrimenti sono solo
// rumore per chi la cerimonia non ce l'ha.
export const weddingPlannerGenreOptions = [
  "Revival",
  "Commerciale",
  "Anni '90",
  "Balli di gruppo",
  "Musica latina",
  "Contemporanea italiana",
  "Mi fido del DJ!!!",
] as const;

export const weddingPlannerSchema = z
  .object({
    email: z.string().trim().email("Inserisci un'email valida."),
    telefono: z.string().trim().max(30).optional(),
    weddingDate: z
      .string()
      .trim()
      .min(1, "Inserisci la data del matrimonio.")
      .refine((value) => !Number.isNaN(Date.parse(value)), "Inserisci una data valida."),
    eventTime: z.string().trim().min(1, "Inserisci l'ora dell'evento."),

    brideName: z.string().trim().min(1, "Inserisci il nome della sposa."),
    brideSurname: z.string().trim().min(1, "Inserisci il cognome della sposa."),
    groomName: z.string().trim().min(1, "Inserisci il nome dello sposo."),
    groomSurname: z.string().trim().min(1, "Inserisci il cognome dello sposo."),

    venueName: z.string().trim().min(1, "Inserisci il nome della location."),
    venueAddress: z.string().trim().min(1, "Inserisci l'indirizzo della location."),

    // "true"/"false" come stringa: arriva da un radio button del form, non
    // da una checkbox — coppia di stringhe più semplice da gestire lato
    // client di un booleano vero in FormData.
    cerimoniaInLoco: z.enum(["true", "false"]),
    ceremonyStartTime: z.string().trim().max(10).optional(),
    ceremonyEntranceSong: z.string().trim().max(200).optional(),
    ceremonyRingSong: z.string().trim().max(200).optional(),
    ceremonyExitSong: z.string().trim().max(200).optional(),

    partyStartTime: z.string().trim().max(10).optional(),
    receptionEntranceSong: z.string().trim().max(200).optional(),
    cakeCuttingSong: z.string().trim().max(200).optional(),
    slowDanceSong: z.string().trim().max(200).optional(),

    genres: z.array(z.enum(weddingPlannerGenreOptions)).optional().default([]),
    otherGenres: z.string().trim().max(300).optional(),
    avoid: z.string().trim().max(1000).optional(),
    notes: z.string().trim().max(2000).optional(),

    // Honeypot anti-spam: vedi commento su contactFormSchema.hp_field.
    hp_field: z.string().max(0).optional().or(z.literal("")),
  })
  .refine((data) => data.cerimoniaInLoco === "false" || data.ceremonyStartTime, {
    message: "Inserisci l'orario di inizio della cerimonia.",
    path: ["ceremonyStartTime"],
  });

export type WeddingPlannerValues = z.infer<typeof weddingPlannerSchema>;
