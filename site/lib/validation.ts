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
