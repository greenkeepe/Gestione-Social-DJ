"use server";

import { randomUUID } from "node:crypto";
import { weddingPlannerSchema, type WeddingPlannerValues } from "@/lib/validation";
import { aggiungiVoceSuGitHub } from "@/lib/github";
import { inviaMessaggioTelegram } from "@/lib/telegram";
import { siteConfig } from "@/data/site";

export type WeddingPlannerState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

interface QuestionarioSposi {
  id: string;
  creatoIl: string;
  email: string;
  dataMatrimonio: string;
  oraEvento: string;
  sposa: { nome: string; cognome: string; telefono: string; email: string; facebook: string; instagram: string };
  sposo: { nome: string; cognome: string; telefono: string; email: string; facebook: string; instagram: string };
  location: { nome: string; indirizzo: string };
  cerimonia: { oraInizio: string; branoIngresso: string; branoScambioAnelli: string; branoUscita: string };
  festa: { oraInizioEvento: string; branoIngressoSala: string; branoTaglioTorta: string; balloLento: string };
  generi: string[];
  altriGeneri: string;
  daEvitare: string;
  noteVarie: string;
  letto: boolean;
}

interface QuestionariFile {
  _istruzioni: string;
  questionari: QuestionarioSposi[];
}

function buildPlainTextEmail(data: WeddingPlannerValues): string {
  return [
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

export async function submitWeddingPlannerForm(
  _prevState: WeddingPlannerState,
  formData: FormData,
): Promise<WeddingPlannerState> {
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

  // La dashboard (best-effort: se GITHUB_REPO/GITHUB_TOKEN non sono
  // configurati su Netlify, non blocca l'invio — l'email resta comunque il
  // canale principale).
  try {
    const voce: QuestionarioSposi = {
      id: randomUUID(),
      creatoIl: new Date().toISOString(),
      email: data.email,
      dataMatrimonio: data.weddingDate,
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
      letto: false,
    };

    await aggiungiVoceSuGitHub<QuestionariFile>(
      "questionari-sposi.json",
      (attuale) => {
        attuale.questionari.unshift(voce);
        return attuale;
      },
      `chore(questionari): nuovo questionario da ${data.brideName} & ${data.groomName}`,
    );
  } catch (err) {
    console.warn("[questionario-sposi] scrittura su GitHub (dashboard) fallita o non configurata:", err);
  }

  // Notifica Telegram (best-effort, come la dashboard).
  await inviaMessaggioTelegram(
    `📋 Nuovo Wedding Music Planner compilato da ${data.brideName} & ${data.groomName}!\nMatrimonio il ${data.weddingDate} a ${data.venueName}.\nTutti i dettagli nella dashboard, sezione "Questionari sposi".`,
  );

  const resendApiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.CONTACT_NOTIFY_EMAIL || siteConfig.email;

  if (!resendApiKey) {
    console.warn(
      "[questionario-sposi] RESEND_API_KEY non configurata: questionario validato ma non inoltrato via email.",
      data,
    );
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
        subject: `Wedding Music Planner — ${data.brideName} & ${data.groomName} (${data.weddingDate})`,
        text: buildPlainTextEmail(data),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend ha risposto con status ${response.status}: ${body}`);
    }
  } catch (error) {
    console.error("[questionario-sposi] invio email fallito", error);
    // La voce è comunque salvata su GitHub/Telegram quando configurati:
    // segnaliamo solo che l'email non è partita, non un fallimento totale.
    return {
      status: "error",
      message:
        "Il questionario non è stato inoltrato via email. Scrivi anche su WhatsApp per sicurezza, Andrea lo recupera comunque dalla dashboard.",
    };
  }

  return { status: "success" };
}
