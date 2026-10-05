"use server";

import { weddingPlannerSchema, type WeddingPlannerValues } from "@/lib/validation";
import { aggiornaEvento, type Evento } from "@/lib/eventi";
import { inviaMessaggioTelegram } from "@/lib/telegram";
import { siteConfig } from "@/data/site";
import { buildRiepilogoSposi, inviaViaResend } from "@/lib/weddingRecapEmail";

export type WeddingPlannerState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

// Email di notifica ad Andrea: testo semplice, va dritto al punto.
function buildNotificaAndrea(cliente: string, data: WeddingPlannerValues): string {
  const haCerimonia = data.cerimoniaInLoco === "true";
  return [
    `Sposi: ${cliente}`,
    `Email: ${data.email}`,
    data.telefono ? `Telefono: ${data.telefono}` : null,
    `Data matrimonio: ${data.weddingDate}`,
    `Ora evento: ${data.eventTime}`,
    "",
    `Sposa: ${data.brideName} ${data.brideSurname}`,
    `Sposo: ${data.groomName} ${data.groomSurname}`,
    "",
    "--- Location ---",
    `Nome: ${data.venueName}`,
    `Indirizzo: ${data.venueAddress}`,
    "",
    "--- Cerimonia ---",
    haCerimonia ? null : "Nessuna cerimonia in loco con il DJ.",
    haCerimonia && data.ceremonyStartTime ? `Orario inizio: ${data.ceremonyStartTime}` : null,
    haCerimonia && data.ceremonyEntranceSong ? `Brano ingresso sposa: ${data.ceremonyEntranceSong}` : null,
    haCerimonia && data.ceremonyRingSong ? `Brano scambio anelli: ${data.ceremonyRingSong}` : null,
    haCerimonia && data.ceremonyExitSong ? `Brano fine cerimonia: ${data.ceremonyExitSong}` : null,
    "",
    "--- La festa ---",
    data.partyStartTime ? `Ora inizio evento: ${data.partyStartTime}` : null,
    data.receptionEntranceSong ? `Brano ingresso sposi in sala: ${data.receptionEntranceSong}` : null,
    data.cakeCuttingSong ? `Brano taglio torta: ${data.cakeCuttingSong}` : null,
    data.slowDanceSong ? `Brano primo ballo: ${data.slowDanceSong}` : null,
    "",
    "--- Generi e mood ---",
    data.genres.length ? `Generi preferiti: ${data.genres.join(", ")}` : null,
    data.otherGenres ? `Altro: ${data.otherGenres}` : null,
    data.avoid ? `Da evitare: ${data.avoid}` : null,
    data.notes ? `Varie ed eventuali: ${data.notes}` : null,
  ]
    .filter((riga): riga is string => riga !== null)
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
    telefono: formData.get("telefono") || undefined,
    weddingDate: formData.get("weddingDate") ?? "",
    eventTime: formData.get("eventTime") ?? "",

    brideName: formData.get("brideName") ?? "",
    brideSurname: formData.get("brideSurname") ?? "",
    groomName: formData.get("groomName") ?? "",
    groomSurname: formData.get("groomSurname") ?? "",

    venueName: formData.get("venueName") ?? "",
    venueAddress: formData.get("venueAddress") ?? "",

    cerimoniaInLoco: formData.get("cerimoniaInLoco") ?? "true",
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
  const haCerimonia = data.cerimoniaInLoco === "true";
  let eventoAggiornato: Evento | null = null;

  // Scrittura su GitHub/dashboard: canale PRINCIPALE in questa architettura
  // (non più best-effort) — senza, il risultato non comparirebbe da nessuna
  // parte di utile per Andrea se anche l'email dovesse fallire in silenzio.
  try {
    await aggiornaEvento(eventId, (evento) => {
      evento.pianificatoreCompilato = true;
      evento.pianificatore = {
        email: data.email,
        telefono: data.telefono ?? "",
        oraEvento: data.eventTime,
        sposa: { nome: data.brideName, cognome: data.brideSurname },
        sposo: { nome: data.groomName, cognome: data.groomSurname },
        location: { nome: data.venueName, indirizzo: data.venueAddress },
        cerimoniaInLoco: haCerimonia,
        cerimonia: {
          oraInizio: haCerimonia ? data.ceremonyStartTime ?? "" : "",
          branoIngresso: haCerimonia ? data.ceremonyEntranceSong ?? "" : "",
          branoScambioAnelli: haCerimonia ? data.ceremonyRingSong ?? "" : "",
          branoUscita: haCerimonia ? data.ceremonyExitSong ?? "" : "",
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

  // Email ad Andrea (best-effort: già tutto salvato su GitHub/dashboard).
  const notifyEmail = process.env.CONTACT_NOTIFY_EMAIL || siteConfig.email;
  try {
    await inviaViaResend({
      to: notifyEmail,
      subject: `Wedding Music Planner — ${cliente} (${data.weddingDate})`,
      text: buildNotificaAndrea(cliente, data),
      replyTo: data.email,
    });
  } catch (error) {
    console.error("[questionario-sposi] invio email ad Andrea fallito", error);
  }

  // Riepilogo automatico agli sposi: email ben formattata (brand Forte DJ),
  // con tutto quello che hanno appena compilato — così hanno sempre a
  // portata di mano cosa ci hanno detto, senza doverlo chiedere ad Andrea.
  try {
    const { html, text } = buildRiepilogoSposi(cliente, data);
    await inviaViaResend({
      to: data.email,
      subject: `Il vostro Wedding Music Planner — ${cliente}`,
      text,
      html,
    });
  } catch (error) {
    console.error("[questionario-sposi] invio riepilogo agli sposi fallito", error);
    // Non blocca il successo: la risposta è comunque salvata e Andrea notificato.
  }

  return { status: "success" };
}
