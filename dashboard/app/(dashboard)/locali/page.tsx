import { leggiDati } from "../../../lib/dataSource";
import type { OutreachConfigFile, OutreachFile } from "../../../lib/types";
import { InviaEmailButton } from "../../../components/InviaEmailButton";
import { ProvinceSelector } from "../../../components/ProvinceSelector";

export const dynamic = "force-dynamic";

export default async function LocaliPage() {
  const file = await leggiDati<OutreachFile>("outreach-locali.json");
  const config = await leggiDati<OutreachConfigFile>("outreach-config.json").catch(() => ({ province: [] }));
  const daRivedere = file.contatti.filter((c) => c.status === "bozza-da-rivedere");
  const storico = file.contatti.filter((c) => c.status !== "bozza-da-rivedere");

  return (
    <div>
      <h2>Locali</h2>
      <p className="note">
        Ogni giorno l&apos;Agente Esploratore trova fino a 10 ristoranti/hotel della zona con un&apos;email pubblica e prepara una bozza di
        collaborazione. <strong>Nessun invio automatico</strong>: rivedi ogni bozza e premi &ldquo;Invia&rdquo; solo su quelle che vuoi mandare
        davvero — parte dalla tua casella Gmail vera, un contatto alla volta.
      </p>

      <ProvinceSelector selezionateIniziali={config.province ?? []} />

      <h3>Da rivedere ({daRivedere.length})</h3>
      {daRivedere.length === 0 && <p className="note">Nessuna nuova bozza al momento.</p>}
      <div className="grid">
        {daRivedere.map((c) => (
          <div className="card" key={c.id}>
            <div className="label">{c.nomeLocale}</div>
            <p className="note">
              {c.categoria === "hotel" ? "Hotel/location" : c.categoria === "restaurant" ? "Ristorante" : "Test"}
              {c.indirizzo ? ` · ${c.indirizzo}` : ""}
            </p>
            <p className="note">
              A: {c.email}
              {c.sitoWeb && (
                <>
                  {" · "}
                  <a href={c.sitoWeb} target="_blank" rel="noreferrer">sito web</a>
                </>
              )}
            </p>
            <p>
              <strong>{c.oggetto}</strong>
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{c.corpo}</p>
            <p className="note">{new Date(c.creatoIl).toLocaleString("it-IT")}</p>
            <InviaEmailButton id={c.id} nomeLocale={c.nomeLocale} />
          </div>
        ))}
      </div>

      {storico.length > 0 && (
        <>
          <h3>Storico</h3>
          <table>
            <thead>
              <tr>
                <th>Locale</th>
                <th>Email</th>
                <th>Stato</th>
                <th>Quando</th>
              </tr>
            </thead>
            <tbody>
              {storico.map((c) => (
                <tr key={c.id}>
                  <td>{c.nomeLocale}</td>
                  <td>{c.email}</td>
                  <td>{c.status}</td>
                  <td>{new Date(c.inviataIl ?? c.creatoIl).toLocaleString("it-IT")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
