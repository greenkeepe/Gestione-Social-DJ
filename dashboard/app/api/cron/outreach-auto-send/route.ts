import { NextResponse } from "next/server";
import { leggiDati, leggiConfig, aggiornaDatiSuGitHub } from "../../../../lib/dataSource";
import { inviaEmail } from "../../../../lib/email";
import { inviaMessaggioTelegram } from "../../../../lib/telegram";
import { registraEsitoAgente } from "../../../../lib/agentLog";
import { firmaTesto, firmaHtml, corpoHtml, type BrandFile } from "../../../../lib/firma";
import type { ContattoLocale, OutreachConfigFile, OutreachFile, OutreachTemplateFile } from "../../../../lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cron giornaliero (vedi dashboard/vercel.json): invia in automatico fino a
// "maxAlGiorno" bozze già pronte dell'Esploratore, sempre e solo col
// modello che Andrea ha validato nella pagina "Locali" — nessuna variante,
// nessuna scrittura di un LLM qui. Due condizioni devono essere vere
// entrambe, indipendenti tra loro: invioAutomatico.attivo=true E un
// modello con validatoIl valorizzato. In caso contrario non fa nulla (non è
// un errore: è lo stato di default finché Andrea non li attiva).
function applicaModello(testo: string, nomeLocale: string): string {
  return testo.replace(/\{\{\s*LOCALE\s*\}\}/g, nomeLocale);
}

const AGENTE = { nome: "Postino", ruolo: "Agente Invio Automatico Locali" };

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const config = await leggiDati<OutreachConfigFile>("outreach-config.json").catch(() => null);
  const invioAutomatico = config?.invioAutomatico;

  if (!invioAutomatico?.attivo) {
    await registraEsitoAgente({
      agente: AGENTE.nome,
      identita: AGENTE.ruolo,
      status: "nessuna-azione",
      riepilogo: "Invio automatico disattivato (attivalo dalla pagina \"Locali\" della dashboard)."
    });
    return NextResponse.json({ ok: true, inviate: 0 });
  }

  const template = await leggiDati<OutreachTemplateFile>("outreach-template.json").catch(() => null);
  if (!template?.validatoIl) {
    await registraEsitoAgente({
      agente: AGENTE.nome,
      identita: AGENTE.ruolo,
      status: "nessuna-azione",
      riepilogo: "Nessun modello email validato: salvalo dalla pagina \"Locali\" prima di attivare l'invio automatico."
    });
    return NextResponse.json({ ok: true, inviate: 0 });
  }

  const maxAlGiorno = invioAutomatico.maxAlGiorno;
  if (!maxAlGiorno || maxAlGiorno <= 0) {
    await registraEsitoAgente({
      agente: AGENTE.nome,
      identita: AGENTE.ruolo,
      status: "nessuna-azione",
      riepilogo: "Numero massimo di invii al giorno impostato a 0."
    });
    return NextResponse.json({ ok: true, inviate: 0 });
  }

  const file = await leggiDati<OutreachFile>("outreach-locali.json");

  // Ulteriore rete di sicurezza, oltre al dedupe già fatto dall'Esploratore
  // in fase di bozza: non invia mai a un indirizzo già contattato in
  // passato, qualunque sia lo stato con cui è registrato oggi.
  const emailGiaContattate = new Set(
    file.contatti.filter((c) => c.status === "inviata").map((c) => c.email.toLowerCase())
  );

  const candidati = file.contatti
    .filter((c) => c.status === "bozza-da-rivedere" && !emailGiaContattate.has(c.email.toLowerCase()))
    .sort((a, b) => new Date(a.creatoIl).getTime() - new Date(b.creatoIl).getTime())
    .slice(0, maxAlGiorno);

  if (candidati.length === 0) {
    await registraEsitoAgente({
      agente: AGENTE.nome,
      identita: AGENTE.ruolo,
      status: "nessuna-azione",
      riepilogo: "Nessuna bozza da inviare automaticamente oggi."
    });
    return NextResponse.json({ ok: true, inviate: 0 });
  }

  const brand = await leggiConfig<BrandFile>("brand.json").catch(() => ({}) as BrandFile);

  const inviati: string[] = [];
  const falliti: string[] = [];

  // Un invio alla volta, in sequenza: aggiornaDatiSuGitHub fa già
  // read-modify-write con lo sha corrente ad ogni chiamata, ma inviare le
  // email in parallelo servirebbe solo a farle arrivare quasi insieme,
  // senza nessun vantaggio reale.
  for (const contatto of candidati) {
    const oggetto = applicaModello(template.oggetto, contatto.nomeLocale);
    const corpo = applicaModello(template.corpo, contatto.nomeLocale);
    const testoFinale = `${corpo}\n\n${firmaTesto(brand)}`;
    const htmlFinale = `${corpoHtml(corpo)}<br><br>${firmaHtml(brand)}`;
    try {
      await inviaEmail({ to: contatto.email, subject: oggetto, text: testoFinale, html: htmlFinale });
    } catch (err) {
      falliti.push(`${contatto.nomeLocale} (${err instanceof Error ? err.message : String(err)})`);
      continue;
    }

    try {
      await aggiornaDatiSuGitHub<OutreachFile>(
        "outreach-locali.json",
        (attuale) => {
          const c = attuale.contatti.find((x) => x.id === contatto.id);
          if (c) {
            c.oggetto = oggetto;
            c.corpo = testoFinale;
            c.status = "inviata";
            c.inviataIl = new Date().toISOString();
            (c as ContattoLocale).inviataAutomaticamente = true;
          }
          return attuale;
        },
        `chore(locali): email inviata automaticamente a "${contatto.nomeLocale}"`
      );
      inviati.push(contatto.nomeLocale);
      emailGiaContattate.add(contatto.email.toLowerCase());
    } catch (err) {
      // L'email è già partita: non la ricontiamo come fallita, ma segnaliamo
      // che lo stato in outreach-locali.json potrebbe non essersi aggiornato.
      falliti.push(`${contatto.nomeLocale} (email inviata ma aggiornamento stato fallito: ${err instanceof Error ? err.message : String(err)})`);
    }
  }

  const riepilogo = `Inviate automaticamente ${inviati.length} email${inviati.length ? `: ${inviati.join(", ")}` : ""}.${
    falliti.length ? ` Falliti: ${falliti.join("; ")}.` : ""
  }`;
  const status = falliti.length > 0 && inviati.length === 0 ? "errore" : "ok";

  await registraEsitoAgente({
    agente: AGENTE.nome,
    identita: AGENTE.ruolo,
    status,
    riepilogo
  });

  await inviaMessaggioTelegram(`${status === "errore" ? "⚠️" : "✅"} ${AGENTE.nome}: ${riepilogo}`);

  return NextResponse.json({ ok: true, inviate: inviati.length, falliti: falliti.length });
}
