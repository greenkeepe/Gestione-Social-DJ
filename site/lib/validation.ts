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
// Stessi campi del modulo Google Form storico ("Wedding Music Planner -
// FORTEDJ"), riportati 1:1: nessuna domanda nuova inventata, solo un modulo
// più curato con validazione reale e invio automatico (email + Telegram +
// dashboard) al posto della scheda risposte di Google Forms.
export const weddingPlannerGenreOptions = [
  "Revival",
  "Commerciale",
  "Anni '90",
  "Balli di gruppo",
  "Musica latina",
  "Contemporanea italiana",
  "Mi fido del DJ!!!",
] as const;

export const weddingPlannerSchema = z.object({
  email: z.string().trim().email("Inserisci un'email valida."),
  weddingDate: z
    .string()
    .trim()
    .min(1, "Inserisci la data del matrimonio.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Inserisci una data valida."),
  eventTime: z.string().trim().min(1, "Inserisci l'ora dell'evento."),

  brideName: z.string().trim().min(1, "Inserisci il nome della sposa."),
  brideSurname: z.string().trim().min(1, "Inserisci il cognome della sposa."),
  bridePhone: z.string().trim().max(30).optional(),
  brideEmail: z.string().trim().email("Inserisci un'email valida per la sposa."),
  brideFacebook: z.string().trim().max(160).optional(),
  brideInstagram: z.string().trim().max(160).optional(),

  groomName: z.string().trim().min(1, "Inserisci il nome dello sposo."),
  groomSurname: z.string().trim().min(1, "Inserisci il cognome dello sposo."),
  groomPhone: z.string().trim().max(30).optional(),
  groomEmail: z.string().trim().email("Inserisci un'email valida per lo sposo."),
  groomFacebook: z.string().trim().max(160).optional(),
  groomInstagram: z.string().trim().max(160).optional(),

  venueName: z.string().trim().min(1, "Inserisci il nome della location."),
  venueAddress: z.string().trim().min(1, "Inserisci l'indirizzo della location."),

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
});

export type WeddingPlannerValues = z.infer<typeof weddingPlannerSchema>;
