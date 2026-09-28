import { MapPin, Bot, Hand, Trash2, Clock } from "lucide-react";
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
import { calcolaProssimiInvii } from "../../../lib/prossimoInvioOutreach";

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

  const prossimiInvii = invioAutomatico.attivo
    ? calcolaProssimiInvii(file.contatti, invioAutomatico.maxAlGiorno, new Date())
    : [];

  return (
    <div>
      <PageHeader
        icon={<MapPin size={22} aria-hidden="true" />}
        title="Locali"
        description="Il sistema cerca da solo ogni giorno nuovi ristoranti/hotel della zona con un'email pubblica e prepara bozze di collaborazione con il modello qui sotto, tenendo la coda sempre piena fino al numero che scegli tu con «invio automatico» — quello stesso numero, entro lo stesso limite giornaliero, viene poi inviato da solo (parte dalla tua casella Gmail vera). A te resta solo rivedere le bozze e, se vuoi, scartarne una prima che parta."
      />

      <TemplateEmailEditor oggettoIniziale={template.oggetto} corpoIniziale={template.corpo} validatoIl={template.validatoIl} />
      <InvioAutomaticoSettings
        attivoIniziale={invioAutomatico.attivo}
        maxAlGiornoIniziale={invioAutomatico.maxAlGiorno}
        modelloValidato={Boolean(template.validatoIl)}
      />

      <ProvinceSelector selezionateIniziali={config.province ?? []} />
      <CercaLocaliButton />

      <h3 className="mt-lg">Prossimi invii automatici</h3>
      {!invioAutomatico.attivo && (
        <EmptyState
          title="Invio automatico disattivato"
          description="Attivalo qui sopra per vedere qui la data e l'ora previste dei prossimi invii."
        />
      )}
      {invioAutomatico.attivo && prossimiInvii.length === 0 && (
        <EmptyState title="Nessun invio in programma" description="Non ci sono bozze in attesa: tocca «Cerca nuovi locali» per trovarne di nuove." />
      )}
      {invioAutomatico.attivo && prossimiInvii.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Locale</th>
                <th>Email</th>
                <th>Invio previsto</th>
              </tr>
            </thead>
            <tbody>
              <LoadMore
                as="table"
                colSpan={3}
                initialCount={20}
                label="invii"
                items={prossimiInvii.map(({ contatto, previstoIl }) => (
                  <tr key={contatto.id}>
                    <td>{contatto.nomeLocale}</td>
                    <td>{contatto.email}</td>
                    <td>
                      <span className="flex gap-xs">
                        <Clock size={14} aria-hidden="true" style={{ opacity: 0.6, flexShrink: 0 }} />
                        {previstoIl.toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                  </tr>
                ))}
              />
            </tbody>
          </table>
        </div>
      )}
      <p className="note">
        Orario indicativo (circa le 10:00, ora italiana): Vercel esegue il controllo automatico entro un&apos;ora da quell&apos;orario, non nel
        minuto esatto.
      </p>

      <h3 className="mt-lg">Da rivedere ({daRivedere.length})</h3>
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
