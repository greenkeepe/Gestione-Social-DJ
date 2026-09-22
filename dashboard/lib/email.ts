// Invio email reale dalla casella Gmail di Andrea, via SMTP con una
// "password per le app" dedicata (mai la password vera dell'account) —
// vedi README > "Contatti locali (email)". Usato quando Andrea preme
// "Invia" su una singola bozza, e dal cron di invio automatico opzionale
// (dashboard/app/api/cron/outreach-auto-send) entro il limite giornaliero
// che Andrea sceglie — mai altrove nel sistema.
import nodemailer from "nodemailer";

export async function inviaEmail(opts: { to: string; subject: string; text: string; html?: string }): Promise<void> {
  const address = process.env.GMAIL_ADDRESS;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!address || !appPassword) {
    throw new Error("GMAIL_ADDRESS/GMAIL_APP_PASSWORD non configurati su Vercel.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: address, pass: appPassword }
  });

  // "text" resta sempre presente come fallback per i client che non
  // renderizzano HTML; "html" (quando fornito) garantisce che telefono,
  // email, WhatsApp, Instagram e sito siano link veri e cliccabili invece
  // di affidarsi al riconoscimento automatico del client di posta.
  await transporter.sendMail({
    from: address,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    ...(opts.html ? { html: opts.html } : {})
  });
}
