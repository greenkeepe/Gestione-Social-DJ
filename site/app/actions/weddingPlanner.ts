"use server";

import { weddingPlannerSchema, type WeddingPlannerValues } from "@/lib/validation";
import { aggiornaEvento, type Evento } from "@/lib/eventi";
import { inviaMessaggioTelegram } from "@/lib/telegram";
import { siteConfig } from "@/data/site";

export type WeddingPlannerState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

function buildPlainTextEmail(cliente: string, data: WeddingPlannerValues): string {
  return [
    `Sposi: ${cliente}`,
    `Email: ${data.email}`,
    `Data matrimonio: ${data.weddingDate}`,
    `Ora evento: ${data.eventTime}`,
    "",
    "--- Sposa ---",
    `Nome: ${data.brideName} ${data.brideSurname}`,
    data.bridePhone ? `Telefono: ${data.bridePhone}` : null,
    `Email: ${data.brideEmail}`,
    data.brideFacebook ? `Facebook: ${data.brideFacebook}` : null,
    data.brideInstagram ? `Instagram: ${data.brideInstagram}` : null,
    "",
    "--- Sposo ---",
    `Nome: ${data.groomName} ${data.groomSurname}`,
    data.groomPhone ? `Telefono: ${data.groomPhone}` : null,
    `Email: ${data.groomEmail}`,
    data.groomFacebook ? `Facebook: ${data.groomFacebook}` : null,
    data.groomInstagram ? `Instagram: ${data.groomInstagram}` : null,
    "",
    "--- Location ---",
    `Nome: ${data.venueName}`,
    `Indirizzo: ${data.venueAddress}`,
    "",
    "--- Cerimonia ---",
    data.ceremonyStartTime ? `Orario inizio: ${data.ceremonyStartTime}` : null,
    data.ceremonyEntranceSong ? `Brano ingresso sposa: ${data.ceremonyEntranceSong}` : null,
    data.ceremonyRingSong ? `Brano scambio anelli: ${data.ceremonyRingSong}` : null,
    data.ceremonyExitSong ? `Brano fine cerimonia: ${data.ceremonyExitSong}` : null,
    "",
    "--- La festa ---",
    data.partyStartTime ? `Ora inizio evento (se cerimonia non in loco): ${data.partyStartTime}` : null,
    data.receptionEntranceSong ? `Brano ingresso sposi in sala: ${data.receptionEntranceSong}` : null,
    data.cakeCuttingSong ? `Brano taglio torta: ${data.cakeCuttingSong}` : null,
    data.slowDanceSong ? `Brano ballo lento: ${data.slowDanceSong}` : null,
    "",
    "--- Generi e mood ---",
    data.genres.length ? `Generi preferiti: ${data.genres.join(", ")}` : null,
    data.otherGenres ? `Altro: ${data.otherGenres}` : null,
    data.avoid ? `Da evitare: ${data.avoid}` : null,
    data.notes ? `Varie ed eventuali: ${data.notes}` : null,
  ]
    .filter((riga): riga is string => Boolean(riga))
    .join("\n");
}

// eventId è vincolato con .bind() dal componente client (vedi
// WeddingPlannerForm.tsx): arriva firmato da Next.js, non è un campo del
// form che un visitatore potrebbe alterare per scrivere nell'evento
// sbagliato.
export async function submitWeddingPlannerForm(
  eventId: string,
  _prevState: WeddingPlannerState,
  formData: FormData,
): Promise<WeddingPlannerState> {
  // Rete di sicurezza: qualunque eccezione imprevista (non solo quelle già
  // previste più sotto) deve comunque tornare come stato leggibile, mai
  // come un errore non gestito — altrimenti chi compila il modulo non vede
  // nessun messaggio, né di successo né di errore, e non sa se è stato
  // inviato o no.
  try {
    return await elaboraInvio(eventId, formData);
  } catch (err) {
    console.error("[questionario-sposi] errore imprevisto non gestito", err);
    return {
      status: "error",
      message: "Qualcosa è andato storto in modo imprevisto. Riprova tra poco, oppure scrivi su WhatsApp ad Andrea per sicurezza.",
    };
  }
}

async function elaboraInvio(eventId: string, formData: FormData): Promise<WeddingPlannerState> {
  const raw = {
    email: formData.get("email") ?? "",
    weddingDate: formData.get("weddingDate") ?? "",
    eventTime: formData.get("eventTime") ?? "",

    brideName: formData.get("brideName") ?? "",
    brideSurname: formData.get("brideSurname") ?? "",
    bridePhone: formData.get("bridePhone") || undefined,
    brideEmail: formData.get("brideEmail") ?? "",
    brideFacebook: formData.get("brideFacebook") || undefined,
    brideInstagram: formData.get("brideInstagram") || undefined,

    groomName: formData.get("groomName") ?? "",
    groomSurname: formData.get("groomSurname") ?? "",
    groomPhone: formData.get("groomPhone") || undefined,
    groomEmail: formData.get("groomEmail") ?? "",
    groomFacebook: formData.get("groomFacebook") || undefined,
    groomInstagram: formData.get("groomInstagram") || undefined,

    venueName: formData.get("venueName") ?? "",
    venueAddress: formData.get("venueAddress") ?? "",

    ceremonyStartTime: formData.get("ceremonyStartTime") || undefined,
    ceremonyEntranceSong: formData.get("ceremonyEntranceSong") || undefined,
    ceremonyRingSong: formData.get("ceremonyRingSong") || undefined,
    ceremonyExitSong: formData.get("ceremonyExitSong") || undefined,

    partyStartTime: formData.get("partyStartTime") || undefined,
    receptionEntranceSong: formData.get("receptionEntranceSong") || undefined,
    cakeCuttingSong: formData.get("cakeCuttingSong") || undefined,
    slowDanceSong: formData.get("slowDanceSong") || undefined,

    genres: formData.getAll("genres"),
    otherGenres: formData.get("otherGenres") || undefined,
    avoid: formData.get("avoid") || undefined,
    notes: formData.get("notes") || undefined,

    hp_field: formData.get("hp_field") ?? "",
  };

  const parsed = weddingPlannerSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    console.warn("[questionario-sposi] validazione fallita, campi:", Object.keys(fieldErrors), fieldErrors);
    return {
      status: "error",
      message: "Controlla i campi evidenziati e riprova.",
      fieldErrors,
    };
  }

  // Honeypot: se compilato è uno spambot. Rispondiamo "successo" senza inviare nulla.
  if (parsed.data.hp_field) {
    return { status: "success" };
  }

  const data = parsed.data;
  let eventoAggiornato: Evento | null = null;

  // Scrittura su GitHub/dashboard: canale PRINCIPALE in questa architettura
  // (non più best-effort) — senza, il risultato non comparirebbe da nessuna
  // parte di utile per Andrea se anche l'email dovesse fallire in silenzio.
  try {
    await aggiornaEvento(eventId, (evento) => {
      evento.pianificatoreCompilato = true;
      evento.pianificatore = {
        email: data.email,
        oraEvento: data.eventTime,
        sposa: {
          nome: data.brideName,
          cognome: data.brideSurname,
          telefono: data.bridePhone ?? "",
          email: data.brideEmail,
          facebook: data.brideFacebook ?? "",
          instagram: data.brideInstagram ?? "",
        },
        sposo: {
          nome: data.groomName,
          cognome: data.groomSurname,
          telefono: data.groomPhone ?? "",
          email: data.groomEmail,
          facebook: data.groomFacebook ?? "",
          instagram: data.groomInstagram ?? "",
        },
        location: { nome: data.venueName, indirizzo: data.venueAddress },
        cerimonia: {
          oraInizio: data.ceremonyStartTime ?? "",
          branoIngresso: data.ceremonyEntranceSong ?? "",
          branoScambioAnelli: data.ceremonyRingSong ?? "",
          branoUscita: data.ceremonyExitSong ?? "",
        },
        festa: {
          oraInizioEvento: data.partyStartTime ?? "",
          branoIngressoSala: data.receptionEntranceSong ?? "",
          branoTaglioTorta: data.cakeCuttingSong ?? "",
          balloLento: data.slowDanceSong ?? "",
        },
        generi: data.genres,
        altriGeneri: data.otherGenres ?? "",
        daEvitare: data.avoid ?? "",
        noteVarie: data.notes ?? "",
        compilatoIl: new Date().toISOString(),
      };
      eventoAggiornato = evento;
      return evento;
    });
  } catch (err) {
    console.error("[questionario-sposi] salvataggio su GitHub/dashboard fallito", err);
    return {
      status: "error",
      message: "Non siamo riusciti a salvare le risposte. Riprova tra poco, oppure scrivi su WhatsApp ad Andrea.",
    };
  }

  const cliente = (eventoAggiornato as Evento | null)?.cliente ?? `${data.brideName} & ${data.groomName}`;

  // Notifica Telegram (best-effort): un canale in più, non blocca nulla se non configurato.
  await inviaMessaggioTelegram(
    `📋 Wedding Music Planner compilato da ${cliente}!\nMatrimonio il ${data.weddingDate} a ${data.venueName}.\nTutti i dettagli nella dashboard, sezione "Eventi".`,
  );

  const resendApiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.CONTACT_NOTIFY_EMAIL || siteConfig.email;

  if (!resendApiKey) {
    console.warn("[questionario-sposi] RESEND_API_KEY non configurata: questionario salvato ma non inoltrato via email.");
    return { status: "success" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL || "Forte DJ <onboarding@resend.dev>",
        to: notifyEmail,
        reply_to: data.email,
        subject: `Wedding Music Planner — ${cliente} (${data.weddingDate})`,
        text: buildPlainTextEmail(cliente, data),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend ha risposto con status ${response.status}: ${body}`);
    }
  } catch (error) {
    console.error("[questionario-sposi] invio email fallito", error);
    // Già salvato su GitHub/dashboard: non è un fallimento totale, solo
    // l'email di cortesia non è partita.
  }

  return { status: "success" };
}
