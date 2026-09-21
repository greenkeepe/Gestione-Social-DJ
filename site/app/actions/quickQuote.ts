"use server";

import { quickQuoteSchema, type QuickQuoteValues } from "@/lib/validation";
import { siteConfig } from "@/data/site";

export type QuickQuoteState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

function buildPlainTextEmail(data: QuickQuoteValues) {
  return [
    `Tipo di evento: ${data.eventType}`,
    `Data evento: ${data.eventDate}`,
    `Location: ${data.location}`,
    `Telefono: ${data.phone}`,
    "",
    "Richiesta di preventivo veloce (widget sul sito): nessuna email fornita, richiamare al numero indicato.",
  ].join("\n");
}

export async function submitQuickQuoteForm(
  _prevState: QuickQuoteState,
  formData: FormData,
): Promise<QuickQuoteState> {
  const raw = {
    eventType: formData.get("eventType") ?? "",
    eventDate: formData.get("eventDate") ?? "",
    location: formData.get("location") ?? "",
    phone: formData.get("phone") ?? "",
    company: formData.get("company") ?? "",
  };

  const parsed = quickQuoteSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Controlla i campi evidenziati e riprova.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Honeypot: se compilato è uno spambot. Rispondiamo "successo" senza inviare nulla.
  if (parsed.data.company) {
    return { status: "success" };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.CONTACT_NOTIFY_EMAIL || siteConfig.email;

  if (!resendApiKey) {
    console.warn(
      "[preventivo-veloce] RESEND_API_KEY non configurata: richiesta validata ma non inoltrata via email.",
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
        subject: `Preventivo veloce — ${parsed.data.eventType}`,
        text: buildPlainTextEmail(parsed.data),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend ha risposto con status ${response.status}: ${body}`);
    }
  } catch (error) {
    console.error("[preventivo-veloce] invio email fallito", error);
    return {
      status: "error",
      message:
        "Non siamo riusciti a inviare la richiesta. Scrivici su WhatsApp nel frattempo.",
    };
  }

  return { status: "success" };
}
