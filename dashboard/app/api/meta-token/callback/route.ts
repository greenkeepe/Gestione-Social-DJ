import { NextResponse } from "next/server";
import { GRAPH_BASE } from "../../../../lib/metaToken";
import { aggiornaSecretGitHub } from "../../../../lib/githubSecret";
import { aggiornaEnvVercel, riavviaDeploymentVercel } from "../../../../lib/vercelEnv";

export const runtime = "nodejs";

function pagina(titolo: string, corpo: string): NextResponse {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${titolo}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:60px auto;padding:0 20px;line-height:1.5;color:#241a42}
  textarea{width:100%;font-family:monospace;font-size:13px;padding:8px;border-radius:8px;border:1px solid #ccc}
  a.btn{display:inline-block;margin-top:16px;padding:10px 16px;background:#4c3a8c;color:#fff;border-radius:8px;text-decoration:none}
</style></head><body><h2>${titolo}</h2>${corpo}<p><a class="btn" href="/utilizzo">Torna alla dashboard</a></p></body></html>`;
  const res = new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  res.cookies.delete("meta_oauth_state");
  return res;
}

// Riceve il "code" dal login Facebook (avviato da /api/meta-token/start),
// lo scambia per un token utente e poi lo estende a lungo termine, prende
// da lì il Page Access Token della Pagina giusta, e prova a salvarlo da
// solo nel secret GitHub META_PAGE_ACCESS_TOKEN. Se la scrittura automatica
// fallisce (permessi insufficienti sul PAT), mostra comunque il token
// pronto da incollare a mano — non lascia mai l'utente a mani vuote.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const erroreParam = url.searchParams.get("error_description") || url.searchParams.get("error");

  if (erroreParam) {
    return pagina("Rinnovo annullato", `<p>Facebook ha segnalato: ${erroreParam}</p>`);
  }

  const cookieState = req.headers.get("cookie")?.match(/meta_oauth_state=([^;]+)/)?.[1];
  if (!code || !state || state !== cookieState) {
    return pagina("Richiesta non valida", "<p>Link scaduto o non valido. Riprova dalla pagina \"Utilizzo servizi\".</p>");
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const pageId = process.env.META_PAGE_ID;
  if (!appId || !appSecret || !pageId) {
    return pagina("Configurazione mancante", "<p><code>META_APP_ID</code>, <code>META_APP_SECRET</code> o <code>META_PAGE_ID</code> non sono impostati su Vercel.</p>");
  }

  const redirectUri = `${url.origin}/api/meta-token/callback`;

  try {
    // 1) code -> token utente short-lived
    const shortRes = await fetch(
      `${GRAPH_BASE}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    );
    const shortJson = (await shortRes.json()) as { access_token?: string; error?: { message: string } };
    if (!shortRes.ok || !shortJson.access_token) {
      return pagina("Errore Facebook", `<p>${shortJson.error?.message ?? "Scambio del codice fallito."}</p>`);
    }

    // 2) token utente short-lived -> long-lived (~60 giorni)
    const longRes = await fetch(
      `${GRAPH_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortJson.access_token}`
    );
    const longJson = (await longRes.json()) as { access_token?: string; error?: { message: string } };
    if (!longRes.ok || !longJson.access_token) {
      return pagina("Errore Facebook", `<p>${longJson.error?.message ?? "Estensione del token fallita."}</p>`);
    }

    // 3) token utente long-lived -> token della Pagina (eredita la non-scadenza)
    const pagesRes = await fetch(`${GRAPH_BASE}/me/accounts?access_token=${longJson.access_token}&fields=id,name,access_token`);
    const pagesJson = (await pagesRes.json()) as {
      data?: Array<{ id: string; name: string; access_token: string }>;
      error?: { message: string };
    };
    if (!pagesRes.ok || !pagesJson.data) {
      return pagina("Errore Facebook", `<p>${pagesJson.error?.message ?? "Impossibile leggere le Pagine gestite."}</p>`);
    }
    const paginaTrovata = pagesJson.data.find((p) => p.id === pageId);
    if (!paginaTrovata) {
      const nomi = pagesJson.data.map((p) => p.name).join(", ") || "nessuna";
      return pagina("Pagina non trovata", `<p>Nessuna Pagina con id ${pageId} tra quelle gestite da questo account Facebook. Pagine trovate: ${nomi}.</p>`);
    }

    const nuovoToken = paginaTrovata.access_token;
    const scritturaGitHub = await aggiornaSecretGitHub("META_PAGE_ACCESS_TOKEN", nuovoToken);

    const vercelConfigurato = Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID);
    let scritturaVercel: { ok: boolean; errore?: string } | null = null;
    let redeploy: { ok: boolean; errore?: string } | null = null;
    if (vercelConfigurato) {
      scritturaVercel = await aggiornaEnvVercel("META_PAGE_ACCESS_TOKEN", nuovoToken);
      if (scritturaVercel.ok) {
        redeploy = await riavviaDeploymentVercel();
      }
    }

    const textarea = `<textarea rows="4" readonly onclick="this.select()">${nuovoToken}</textarea>`;

    if (!scritturaGitHub.ok) {
      return pagina(
        "Token generato, salvalo tu",
        `<p>Il nuovo token per <strong>${paginaTrovata.name}</strong> è pronto, ma non sono riuscito a salvarlo da solo nei secrets di GitHub: ${scritturaGitHub.errore}</p>
         <p>Copialo e incollalo in <strong>Settings → Secrets and variables → Actions → META_PAGE_ACCESS_TOKEN → Update</strong>:</p>
         ${textarea}`
      );
    }

    if (vercelConfigurato && scritturaVercel?.ok && redeploy?.ok) {
      return pagina(
        "Token rinnovato ✅",
        `<p>Il nuovo token per <strong>${paginaTrovata.name}</strong> è stato salvato da solo sia su GitHub (<code>META_PAGE_ACCESS_TOKEN</code>) sia su Vercel, e ho avviato un nuovo deployment per farlo leggere subito. Non devi fare nulla: tra un minuto circa il conto alla rovescia qui in dashboard sarà già aggiornato.</p>`
      );
    }

    const dettaglioVercel = !vercelConfigurato
      ? `<p>Il salvataggio automatico su Vercel non è attivo (<code>VERCEL_TOKEN</code>/<code>VERCEL_PROJECT_ID</code> non configurati) — vedi README &gt; "Rinnovo del token Meta dalla dashboard" per attivarlo una volta per tutte.</p>`
      : !scritturaVercel?.ok
        ? `<p>Il salvataggio automatico su Vercel non è riuscito: ${scritturaVercel?.errore}</p>`
        : `<p>Salvato su Vercel, ma il riavvio automatico del deployment non è riuscito: ${redeploy?.errore}. Fai un Redeploy a mano da Vercel → Deployments.</p>`;

    return pagina(
      "Token rinnovato su GitHub ✅ — completa su Vercel",
      `<p>Il nuovo token per <strong>${paginaTrovata.name}</strong> è stato salvato automaticamente nel secret <code>META_PAGE_ACCESS_TOKEN</code> su GitHub: le pubblicazioni continuano a funzionare da sole, non serve altro per quelle.</p>
       ${dettaglioVercel}
       <p>Per completare a mano, incollalo su Vercel in <code>META_PAGE_ACCESS_TOKEN</code> (Settings → Environment Variables) e fai un Redeploy:</p>
       ${textarea}`
    );
  } catch (err) {
    return pagina("Errore imprevisto", `<p>${err instanceof Error ? err.message : String(err)}</p>`);
  }
}
