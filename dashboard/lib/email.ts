// Invio email reale dalla casella Gmail di Andrea, via SMTP con una
// "password per le app" dedicata (mai la password vera dell'account) —
// vedi README > "Contatti locali (email)". Usato SOLO quando Andrea preme
// "Invia" su una bozza già scritta: nessun invio automatico/massivo da
// nessuna parte del sistema.
import nodemailer from "nodemailer";

export async function inviaEmail(opts: { to: string; subject: string; text: string }): Promise<void> {
  const address = process.env.GMAIL_ADDRESS;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!address || !appPassword) {
    throw new Error("GMAIL_ADDRESS/GMAIL_APP_PASSWORD non configurati su Vercel.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: address, pass: appPassword }
  });

  await transporter.sendMail({
    from: address,
    to: opts.to,
    subject: opts.subject,
    text: opts.text
  });
}
