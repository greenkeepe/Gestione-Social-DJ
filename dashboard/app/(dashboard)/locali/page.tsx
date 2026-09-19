import { leggiDati } from "../../../lib/dataSource";
import type { OutreachConfigFile, OutreachFile } from "../../../lib/types";
import { ProvinceSelector } from "../../../components/ProvinceSelector";
import { TabellaBozzeLocali } from "../../../components/TabellaBozzeLocali";
import { CercaLocaliButton } from "../../../components/CercaLocaliButton";

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
        Tocca &ldquo;Cerca nuovi locali&rdquo; quando vuoi: trova fino a 10 ristoranti/hotel della zona con un&apos;email pubblica e prepara una
        bozza di collaborazione. <strong>Nessun invio automatico</strong>: rivedi ogni bozza e premi &ldquo;Invia&rdquo; solo su quelle che vuoi
        mandare davvero — parte dalla tua casella Gmail vera, un contatto alla volta.
      </p>

      <ProvinceSelector selezionateIniziali={config.province ?? []} />
      <CercaLocaliButton />

      <h3>Da rivedere ({daRivedere.length})</h3>
      {daRivedere.length === 0 && <p className="note">Nessuna nuova bozza al momento.</p>}
      {daRivedere.length > 0 && <TabellaBozzeLocali contatti={daRivedere} />}

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
