// Firma reale delle email ai locali: presa SEMPRE da config/brand.json al
// momento dell'invio (mai salvata dentro il modello o nella bozza), così
// resta aggiornata da sola se cambiano numero/social/sito. Stesso principio
// della CTA nelle didascalie social: contatti veri, mai un link inventato.
// La versione HTML rende i contatti veri link cliccabili (tel:, mailto:,
// wa.me, sito, Instagram); Facebook resta testo semplice finché non esiste
// una URL verificata in brand.json.
export interface BrandContatti {
  telefono?: string;
  whatsapp?: string;
  email?: string;
  sitoWeb?: string;
  instagram?: string;
  facebook?: string;
}

export interface BrandFile {
  nomeArte?: string;
  contatti?: BrandContatti;
}

function soloCifre(numero: string): string {
  return numero.replace(/\D/g, "");
}

function perTelHref(numero: string): string {
  return numero.replace(/[^\d+]/g, "");
}

function handleInstagram(instagram: string): string {
  return instagram.replace(/^@/, "");
}

export function escapeHtml(testo: string): string {
  return testo
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function corpoHtml(corpo: string): string {
  return escapeHtml(corpo).replace(/\n/g, "<br>\n");
}

export function firmaTesto(brand: BrandFile): string {
  const c = brand.contatti ?? {};
  const righe = [
    `Andrea${brand.nomeArte ? ` — ${brand.nomeArte}` : ""}`,
    c.telefono ? `📞 Tel: ${c.telefono}` : null,
    c.whatsapp ? `💬 WhatsApp: wa.me/${soloCifre(c.whatsapp)}` : null,
    c.email ? `✉️ Email: ${c.email}` : null,
    c.instagram ? `📸 Instagram: instagram.com/${handleInstagram(c.instagram)}` : null,
    c.facebook ? `📘 Facebook: cerca "${c.facebook}"` : null,
    c.sitoWeb ? `🔗 Sito/recensioni: ${c.sitoWeb}` : null
  ].filter((r): r is string => Boolean(r));
  return righe.join("\n");
}

export function firmaHtml(brand: BrandFile): string {
  const c = brand.contatti ?? {};
  const righe = [
    `Andrea${brand.nomeArte ? ` — ${escapeHtml(brand.nomeArte)}` : ""}`,
    c.telefono ? `📞 Tel: <a href="tel:${perTelHref(c.telefono)}">${escapeHtml(c.telefono)}</a>` : null,
    c.whatsapp
      ? `💬 WhatsApp: <a href="https://wa.me/${soloCifre(c.whatsapp)}">wa.me/${soloCifre(c.whatsapp)}</a>`
      : null,
    c.email ? `✉️ Email: <a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>` : null,
    c.instagram
      ? `📸 Instagram: <a href="https://instagram.com/${escapeHtml(handleInstagram(c.instagram))}">instagram.com/${escapeHtml(handleInstagram(c.instagram))}</a>`
      : null,
    // Nessuna URL Facebook verificata in brand.json: resta testo semplice,
    // mai un link inventato.
    c.facebook ? `📘 Facebook: cerca &quot;${escapeHtml(c.facebook)}&quot;` : null,
    c.sitoWeb ? `🔗 Sito/recensioni: <a href="${escapeHtml(c.sitoWeb)}">${escapeHtml(c.sitoWeb)}</a>` : null
  ].filter((r): r is string => Boolean(r));
  return righe.join("<br>\n");
}
