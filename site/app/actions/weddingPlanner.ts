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

function formattaData(data: string): string {
  const d = new Date(`${data}T00:00:00`);
  if (Number.isNaN(d.getTime())) return data;
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

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

function riga(label: string, valore?: string | null): string {
  if (!valore) return "";
  return `<tr><td style="padding:4px 0;color:#8a8070;font-size:13px;width:180px;vertical-align:top;">${label}</td><td style="padding:4px 0;color:#2a2518;font-size:14px;">${valore}</td></tr>`;
}

function sezione(titolo: string, righeHtml: string): string {
  if (!righeHtml.trim()) return "";
  return `
    <tr><td style="padding-top:24px;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#c9a876;font-weight:700;">${titolo}</p>
      <table role="presentation" width="100%" style="border-collapse:collapse;">${righeHtml}</table>
    </td></tr>`;
}

// Riepilogo per gli sposi: pensato per essere letto (e magari stampato),
// non un dump tecnico — sezioni chiare, colori del brand, niente righe
// vuote per i campi lasciati bianchi.
function buildRiepilogoSposi(cliente: string, data: WeddingPlannerValues): { html: string; text: string } {
  const haCerimonia = data.cerimoniaInLoco === "true";

  const html = `
  <div style="background:#faf8f3;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ece6d8;">
      <tr><td style="height:6px;background:linear-gradient(90deg,#c9a876,#e2c896);"></td></tr>
      <tr><td style="padding:32px 32px 8px;text-align:center;">
        <p style="margin:0;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#c9a876;font-weight:700;">Forte DJ</p>
        <h1 style="margin:12px 0 0;font-size:24px;color:#2a2518;">Il vostro Wedding Music Planner</h1>
        <p style="margin:12px 0 0;font-size:14px;color:#6b6353;line-height:1.6;">
          Grazie ${cliente}! Ecco il riepilogo di tutto quello che ci avete mandato per il ${formattaData(data.weddingDate)}.
          Se volete aggiungere o cambiare qualcosa, scriveteci pure su WhatsApp.
        </p>
      </td></tr>
      <tr><td style="padding:0 32px 32px;">
        <table role="presentation" width="100%" style="border-collapse:collapse;">
          ${sezione("L'evento", `${riga("Data", formattaData(data.weddingDate))}${riga("Ora", data.eventTime)}${riga("Sposa", `${data.brideName} ${data.brideSurname}`)}${riga("Sposo", `${data.groomName} ${data.groomSurname}`)}`)}
          ${sezione("Location", `${riga("Nome", data.venueName)}${riga("Indirizzo", data.venueAddress)}`)}
          ${
            haCerimonia
              ? sezione(
                  "Cerimonia",
                  `${riga("Orario inizio", data.ceremonyStartTime)}${riga("Ingresso sposa", data.ceremonyEntranceSong)}${riga("Scambio anelli", data.ceremonyRingSong)}${riga("Fine cerimonia", data.ceremonyExitSong)}`,
                )
              : sezione("Cerimonia", riga("Nota", "Nessuna cerimonia in loco con il DJ"))
          }
          ${sezione("La festa", `${riga("Ora inizio evento", data.partyStartTime)}${riga("Ingresso sposi in sala", data.receptionEntranceSong)}${riga("Taglio torta", data.cakeCuttingSong)}${riga("Primo ballo", data.slowDanceSong)}`)}
          ${sezione("Generi e mood", `${riga("Generi preferiti", data.genres.join(", "))}${riga("Altro", data.otherGenres)}${riga("Da evitare", data.avoid)}${riga("Note", data.notes)}`)}
        </table>
      </td></tr>
      <tr><td style="padding:24px 32px;background:#faf8f3;border-top:1px solid #ece6d8;text-align:center;">
        <p style="margin:0;font-size:13px;color:#6b6353;">A presto,<br><strong style="color:#2a2518;">Andrea – Forte DJ</strong></p>
        ${siteConfig.whatsappHref ? `<p style="margin:8px 0 0;font-size:12px;"><a href="${siteConfig.whatsappHref}" style="color:#c9a876;text-decoration:none;">💬 Scrivimi su WhatsApp</a></p>` : ""}
      </td></tr>
    </table>
  </div>`;

  const text = [
    `Il vostro Wedding Music Planner — ${cliente}`,
    `Matrimonio: ${formattaData(data.weddingDate)}, ore ${data.eventTime}`,
    `Location: ${data.venueName} — ${data.venueAddress}`,
    haCerimonia ? `Cerimonia in loco, inizio ore ${data.ceremonyStartTime ?? "—"}` : "Nessuna cerimonia in loco con il DJ.",
    "",
    "Grazie per aver compilato il questionario! Per modifiche, scrivi su WhatsApp.",
    "Andrea – Forte DJ",
  ].join("\n");

  return { html, text };
}

async function inviaViaResend(opts: { to: string; subject: string; text: string; html?: string; replyTo?: string }): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn("[questionario-sposi] RESEND_API_KEY non configurata: email non inoltrata.", opts.subject);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL || "Forte DJ <onboarding@resend.dev>",
      to: opts.to,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      subject: opts.subject,
      text: opts.text,
      ...(opts.html ? { html: opts.html } : {}),
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend ha risposto con status ${response.status}: ${body}`);
  }
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
