import { MapPin, Bot, Hand, Trash2 } from "lucide-react";
import { leggiDati, leggiConfig } from "../../../lib/dataSource";
import type { OutreachConfigFile, OutreachFile, OutreachTemplateFile } from "../../../lib/types";
import { firmaTesto, type BrandFile } from "../../../lib/firma";
import { ProvinceSelector } from "../../../components/ProvinceSelector";
import { TabellaBozzeLocali } from "../../../components/TabellaBozzeLocali";
import { CercaLocaliButton } from "../../../components/CercaLocaliButton";
import { TemplateEmailEditor } from "../../../components/TemplateEmailEditor";
import { InvioAutomaticoSettings } from "../../../components/InvioAutomaticoSettings";
import { PageHeader } from "../../../components/ui/PageHeader";
import { EmptyState } from "../../../components/ui/EmptyState";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { LoadMore } from "../../../components/ui/LoadMore";
import { statusVocabulary } from "../../../lib/statusVocabulary";

export const dynamic = "force-dynamic";

const MODELLO_DI_RISERVA: OutreachTemplateFile = {
  oggetto: "Collaborazione per Eventi e/o Matrimoni.",
  corpo:
    "Buongiorno,\nsono Andrea di Forte DJ, DJ professionista specializzato in matrimoni ed eventi, con oltre 20 anni di esperienza, più di 200 eventi realizzati e oltre 75 recensioni a 5 stelle.\nMi piacerebbe entrare in contatto con {{LOCALE}} per valutare una possibile collaborazione come vostro DJ e fornitore di fiducia per matrimoni ed eventi.\nOffro un servizio completo e personalizzato, che comprende:\n\n* 🎧 DJ set e playlist personalizzate in base agli sposi e al tipo di evento\n* 🔊 Impianto audio professionale\n* 💡 Luci scenografiche\n* 🌫️ Effetti fumo\n* ⚡ Montaggio e preparazione tecnica in meno di un'ora\n* 🤝 Massima attenzione alla collaborazione con location e staff durante l'evento\n\nL'obiettivo è offrirvi un servizio affidabile e professionale, che possa diventare un valore aggiunto per gli eventi organizzati presso la vostra struttura.\nSe siete interessati, sarei felice di conoscervi di persona e fissare un breve sopralluogo, così da presentarvi il mio servizio e valutare insieme eventuali modalità di collaborazione.\nGrazie per l'attenzione e resto a disposizione.\nUn saluto,",
  validatoIl: null
};

export default async function LocaliPage() {
  const file = await leggiDati<OutreachFile>("outreach-locali.json");
  const config = await leggiDati<OutreachConfigFile>("outreach-config.json").catch((): OutreachConfigFile => ({ province: [] }));
  const template = await leggiDati<OutreachTemplateFile>("outreach-template.json").catch(() => MODELLO_DI_RISERVA);
  const brand = await leggiConfig<BrandFile>("brand.json").catch(() => ({}) as BrandFile);
  const daRivedere = file.contatti.filter((c) => c.status === "bozza-da-rivedere");
  const storico = [...file.contatti]
    .filter((c) => c.status !== "bozza-da-rivedere")
    .sort((a, b) => new Date(b.inviataIl ?? b.creatoIl).getTime() - new Date(a.inviataIl ?? a.creatoIl).getTime());
  const invioAutomatico = config.invioAutomatico ?? { attivo: false, maxAlGiorno: 3 };
  const anteprimaFirma = firmaTesto(brand);

  const inviateAutomatico = storico.filter((c) => c.status === "inviata" && c.inviataAutomaticamente).length;
  const inviateAMano = storico.filter((c) => c.status === "inviata" && !c.inviataAutomaticamente).length;
  const scartate = storico.filter((c) => c.status === "scartata").length;

  return (
    <div>
      <PageHeader
        icon={<MapPin size={22} aria-hidden="true" />}
        title="Locali"
        description="Tocca «Cerca nuovi locali» quando vuoi: trova fino a 10 ristoranti/hotel della zona con un'email pubblica e prepara una bozza di collaborazione, sempre con il modello qui sotto. Puoi rivedere ogni bozza e inviarla a mano con un tap, oppure attivare l'invio automatico entro il limite giornaliero che scegli tu — parte comunque dalla tua casella Gmail vera."
      />

      <TemplateEmailEditor oggettoIniziale={template.oggetto} corpoIniziale={template.corpo} validatoIl={template.validatoIl} />
      <InvioAutomaticoSettings
        attivoIniziale={invioAutomatico.attivo}
        maxAlGiornoIniziale={invioAutomatico.maxAlGiorno}
        modelloValidato={Boolean(template.validatoIl)}
      />

      <ProvinceSelector selezionateIniziali={config.province ?? []} />
      <CercaLocaliButton />

      <h3>Da rivedere ({daRivedere.length})</h3>
      {daRivedere.length === 0 && <EmptyState title="Nessuna nuova bozza al momento" />}
      {daRivedere.length > 0 && <TabellaBozzeLocali contatti={daRivedere} anteprimaFirma={anteprimaFirma} />}

      <h3>Destinatari contattati ({storico.length})</h3>
      <div className="grid">
        <div className="card card--stat">
          <div className="stat-top">
            <div className="label">Inviate automaticamente</div>
            <Bot className="stat-icon" size={18} aria-hidden="true" />
          </div>
          <div className="value">{inviateAutomatico}</div>
        </div>
        <div className="card card--stat">
          <div className="stat-top">
            <div className="label">Inviate a mano</div>
            <Hand className="stat-icon" size={18} aria-hidden="true" />
          </div>
          <div className="value">{inviateAMano}</div>
        </div>
        <div className="card card--stat">
          <div className="stat-top">
            <div className="label">Scartate</div>
            <Trash2 className="stat-icon" size={18} aria-hidden="true" />
          </div>
          <div className="value">{scartate}</div>
        </div>
      </div>

      {storico.length === 0 && <EmptyState title="Nessun invio ancora registrato" />}
      {storico.length > 0 && (
        <div className="table-scroll">
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
              <LoadMore
                as="table"
                colSpan={4}
                initialCount={20}
                label="contatti"
                items={storico.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nomeLocale}</td>
                    <td>{c.email}</td>
                    <td>
                      <StatusBadge {...statusVocabulary.outreach(c.status)} />
                      {c.inviataAutomaticamente ? " · automatico" : c.status === "inviata" ? " · a mano" : ""}
                    </td>
                    <td>{new Date(c.inviataIl ?? c.creatoIl).toLocaleString("it-IT")}</td>
                  </tr>
                ))}
              />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
