import { leggiDati, leggiConfig } from "../../../lib/dataSource";
import type { OutreachConfigFile, OutreachFile, OutreachTemplateFile } from "../../../lib/types";
import { firmaTesto, type BrandFile } from "../../../lib/firma";
import { ProvinceSelector } from "../../../components/ProvinceSelector";
import { TabellaBozzeLocali } from "../../../components/TabellaBozzeLocali";
import { CercaLocaliButton } from "../../../components/CercaLocaliButton";
import { TemplateEmailEditor } from "../../../components/TemplateEmailEditor";
import { InvioAutomaticoSettings } from "../../../components/InvioAutomaticoSettings";

export const dynamic = "force-dynamic";

const MODELLO_DI_RISERVA: OutreachTemplateFile = {
  oggetto: "Proposta di collaborazione — Forte DJ",
  corpo:
    "Buongiorno,\n\nsono Andrea di Forte DJ, DJ professionista per matrimoni ed eventi (20 anni di esperienza, 200+ eventi, oltre 75 recensioni a 5 stelle).\n\nMi piacerebbe presentarmi a voi di {{LOCALE}} come possibile fornitore di fiducia per i matrimoni ed eventi che ospitate: playlist su misura, impianto audio/luci/fumo completo, montaggio in meno di un'ora.\n\nSe vi va, sarei felice di fissare un sopralluogo tecnico quando preferite.\n\nGrazie per l'attenzione,",
  validatoIl: null
};

export default async function LocaliPage() {
  const file = await leggiDati<OutreachFile>("outreach-locali.json");
  const config = await leggiDati<OutreachConfigFile>("outreach-config.json").catch((): OutreachConfigFile => ({ province: [] }));
  const template = await leggiDati<OutreachTemplateFile>("outreach-template.json").catch(() => MODELLO_DI_RISERVA);
  const brand = await leggiConfig<BrandFile>("brand.json").catch(() => ({}) as BrandFile);
  const daRivedere = file.contatti.filter((c) => c.status === "bozza-da-rivedere");
  const storico = file.contatti.filter((c) => c.status !== "bozza-da-rivedere");
  const invioAutomatico = config.invioAutomatico ?? { attivo: false, maxAlGiorno: 3 };
  const anteprimaFirma = firmaTesto(brand);

  return (
    <div>
      <h2>Locali</h2>
      <p className="note">
        Tocca &ldquo;Cerca nuovi locali&rdquo; quando vuoi: trova fino a 10 ristoranti/hotel della zona con un&apos;email pubblica e prepara una
        bozza di collaborazione, sempre con il modello qui sotto. Puoi rivedere ogni bozza e inviarla a mano con un tap, oppure attivare
        l&apos;invio automatico entro il limite giornaliero che scegli tu — parte comunque dalla tua casella Gmail vera.
      </p>

      <TemplateEmailEditor oggettoIniziale={template.oggetto} corpoIniziale={template.corpo} validatoIl={template.validatoIl} />
      <InvioAutomaticoSettings
        attivoIniziale={invioAutomatico.attivo}
        maxAlGiornoIniziale={invioAutomatico.maxAlGiorno}
        modelloValidato={Boolean(template.validatoIl)}
      />

      <ProvinceSelector selezionateIniziali={config.province ?? []} />
      <CercaLocaliButton />

      <h3>Da rivedere ({daRivedere.length})</h3>
      {daRivedere.length === 0 && <p className="note">Nessuna nuova bozza al momento.</p>}
      {daRivedere.length > 0 && <TabellaBozzeLocali contatti={daRivedere} anteprimaFirma={anteprimaFirma} />}

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
                  <td>
                    {c.status}
                    {c.inviataAutomaticamente ? " · 🤖 automatico" : ""}
                  </td>
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
