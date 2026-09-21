"use server";

import { contactFormSchema, type ContactFormValues } from "@/lib/validation";
import { siteConfig } from "@/data/site";

export type ContactFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

function buildPlainTextEmail(data: ContactFormValues) {
  return [
    `Nome: ${data.name}`,
    `Email: ${data.email}`,
    `Telefono: ${data.phone}`,
    `Tipo di evento: ${data.eventType}`,
    data.eventDate ? `Data evento: ${data.eventDate}` : null,
    data.location ? `Location: ${data.location}` : null,
    data.guestCount ? `Numero invitati: ${data.guestCount}` : null,
    data.desiredServices?.length
      ? `Servizi desiderati: ${data.desiredServices.join(", ")}`
      : null,
    data.referral ? `Come ci ha conosciuto: ${data.referral}` : null,
    data.message ? `Messaggio:\n${data.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const raw = {
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    eventType: formData.get("eventType") ?? "",
    eventDate: formData.get("eventDate") || undefined,
    location: formData.get("location") || undefined,
    guestCount: formData.get("guestCount") || undefined,
    desiredServices: formData.getAll("desiredServices"),
    message: formData.get("message") || undefined,
    referral: formData.get("referral") || undefined,
    hp_field: formData.get("hp_field") ?? "",
  };

  const parsed = contactFormSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    console.warn("[contatti] validazione fallita, campi:", Object.keys(fieldErrors), fieldErrors);
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

  const resendApiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.CONTACT_NOTIFY_EMAIL || siteConfig.email;

  if (!resendApiKey) {
    console.warn(
      "[contatti] RESEND_API_KEY non configurata: richiesta validata ma non inoltrata via email.",
      parsed.data,
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
        reply_to: parsed.data.email,
        subject: `Nuova richiesta disponibilità — ${parsed.data.eventType}`,
        text: buildPlainTextEmail(parsed.data),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend ha risposto con status ${response.status}: ${body}`);
    }
  } catch (error) {
    console.error("[contatti] invio email fallito", error);
    return {
      status: "error",
      message:
        "Non siamo riusciti a inviare la richiesta. Scrivici su WhatsApp o via email nel frattempo.",
    };
  }

  return { status: "success" };
}
