import type { WeddingPlannerValues } from "@/lib/validation";
import { siteConfig } from "@/data/site";

// Non "use server": qui vivono funzioni sincrone (costruzione HTML) più
// l'invio via Resend. Il Server Action di app/actions/weddingPlanner.ts
// può solo esportare funzioni async, quindi questi helper stanno in un
// modulo separato, condiviso anche dalla route di anteprima.

export function formattaData(data: string): string {
  const d = new Date(`${data}T00:00:00`);
  if (Number.isNaN(d.getTime())) return data;
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
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
export function buildRiepilogoSposi(cliente: string, data: WeddingPlannerValues): { html: string; text: string } {
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

export async function inviaViaResend(opts: { to: string; subject: string; text: string; html?: string; replyTo?: string }): Promise<void> {
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
