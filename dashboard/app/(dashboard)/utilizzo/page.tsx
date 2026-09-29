import { Gauge } from "lucide-react";
import { leggiDati } from "../../../lib/dataSource";
import { ServiceLimitsForm } from "../../../components/ServiceLimitsForm";
import { ProgressRing } from "../../../components/ProgressRing";
import { controllaTokenMeta } from "../../../lib/metaToken";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Tabs } from "../../../components/ui/Tabs";

export const dynamic = "force-dynamic";

interface ServiceLimitsFile {
  servizi: {
    r2: {
      nome: string;
      limiteBytes: number;
      sogliaPercentualePausa: number;
      usoAttualeBytes: number;
      oggettiAttuali: number;
      aggiornatoIl: string | null;
      pausatoIl: string | null;
    };
    anthropic: {
      nome: string;
      limiteChiamateMese: number;
      sogliaPercentualePausa: number;
      chiamateEffettuateMese: number;
      meseCorrente: string;
      aggiornatoIl: string | null;
      pausatoIl: string | null;
    };
  };
}

function formattaGb(bytes: number): string {
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default async function UtilizzoPage() {
  const limiti = await leggiDati<ServiceLimitsFile>("service-limits.json");
  const r2 = limiti.servizi.r2;
  const anthropic = limiti.servizi.anthropic;
  const tokenMeta = await controllaTokenMeta();
  const giorniRimanenti = tokenMeta.scadeIl
    ? Math.ceil((new Date(tokenMeta.scadeIl).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const coloreToken =
    tokenMeta.errore || (giorniRimanenti !== null && giorniRimanenti <= 7)
      ? "var(--color-err)"
      : giorniRimanenti !== null && giorniRimanenti <= 21
        ? "#c98a1a"
        : "var(--color-primary)";

  const percentualeR2 = r2.limiteBytes > 0 ? Math.min(100, (r2.usoAttualeBytes / r2.limiteBytes) * 100) : 0;
  const pausatoR2 = r2.pausatoIl !== null;

  const percentualeAnthropic = anthropic.limiteChiamateMese > 0 ? Math.min(100, (anthropic.chiamateEffettuateMese / anthropic.limiteChiamateMese) * 100) : 0;
  const pausatoAnthropic = anthropic.pausatoIl !== null;
  // La chiave è nei secrets di GitHub Actions (dove gira davvero l'Agente
  // Contenuti), non nelle variabili d'ambiente di Vercel: process.env qui
  // sarebbe sempre vuoto anche a chiave impostata e funzionante. Il segnale
  // giusto è quindi l'uso reale già registrato, non una variabile che su
  // questo runtime non esisterà mai.
  const anthropicConfigurata = anthropic.aggiornatoIl !== null || anthropic.chiamateEffettuateMese > 0;

  const r2Tab = (
    <div className="card mt-md">
      <div className="flex-between">
        <div className="label">{r2.nome}</div>
        {pausatoR2 && <StatusBadge label="In pausa" tone="err" />}
      </div>
      <div className="stat-with-ring mt-sm">
        <ProgressRing
          percentage={percentualeR2}
          color={percentualeR2 >= r2.sogliaPercentualePausa ? "var(--color-err)" : "var(--color-primary)"}
          label={`${percentualeR2.toFixed(0)}%`}
          sublabel={`soglia ${r2.sogliaPercentualePausa}%`}
        />
        <div className="stat-with-ring__details">
          <div className="progress-bar">
            <div style={{ width: `${percentualeR2}%`, background: percentualeR2 >= r2.sogliaPercentualePausa ? "var(--color-err)" : undefined }} />
          </div>
          <p className="note mt-sm">
            {formattaGb(r2.usoAttualeBytes)} / {formattaGb(r2.limiteBytes)} ({percentualeR2.toFixed(1)}%) — {r2.oggettiAttuali} file
          </p>
          <p className="note">
            {r2.aggiornatoIl ? `Ultima misurazione: ${new Date(r2.aggiornatoIl).toLocaleString("it-IT")}` : "Non ancora misurato: attendi il prossimo ciclo agenti."}
          </p>
        </div>
      </div>
      {pausatoR2 && (
        <p className="error-msg">
          Caricamento di nuovi media (Telegram e dashboard) in pausa da{" "}
          {r2.pausatoIl ? new Date(r2.pausatoIl).toLocaleString("it-IT") : ""}. Elimina media che non ti servono più dalla pagina{" "}
          <a href="/carica">Carica</a> per liberare spazio, oppure alza la soglia qui sotto.
        </p>
      )}
      <ServiceLimitsForm servizio="r2" limite={r2.limiteBytes} sogliaPercentualePausa={r2.sogliaPercentualePausa} pausato={pausatoR2} />
    </div>
  );

  const anthropicTab = (
    <div className="card mt-md">
      <div className="flex-between">
        <div className="label">{anthropic.nome}</div>
        {pausatoAnthropic && <StatusBadge label="In pausa" tone="err" />}
      </div>
      {anthropicConfigurata ? (
        <>
          <div className="stat-with-ring mt-sm">
            <ProgressRing
              percentage={percentualeAnthropic}
              color={percentualeAnthropic >= anthropic.sogliaPercentualePausa ? "var(--color-err)" : "var(--color-primary)"}
              label={`${percentualeAnthropic.toFixed(0)}%`}
              sublabel={`soglia ${anthropic.sogliaPercentualePausa}%`}
            />
            <div className="stat-with-ring__details">
              <div className="progress-bar">
                <div
                  style={{
                    width: `${percentualeAnthropic}%`,
                    background: percentualeAnthropic >= anthropic.sogliaPercentualePausa ? "var(--color-err)" : undefined
                  }}
                />
              </div>
              <p className="note mt-sm">
                {anthropic.chiamateEffettuateMese} / {anthropic.limiteChiamateMese} chiamate ({percentualeAnthropic.toFixed(1)}%) — mese{" "}
                {anthropic.meseCorrente}
              </p>
              <p className="note">
                {anthropic.aggiornatoIl ? `Ultima chiamata: ${new Date(anthropic.aggiornatoIl).toLocaleString("it-IT")}` : "Ancora nessuna chiamata questo mese."}
              </p>
              <p className="note">Costo indicativo: pochi centesimi ogni 100 chiamate. Il conto reale è su console.anthropic.com.</p>
            </div>
          </div>
          {pausatoAnthropic && (
            <p className="error-msg">
              Chiamate in pausa da {anthropic.pausatoIl ? new Date(anthropic.pausatoIl).toLocaleString("it-IT") : ""}: le didascalie tornano
              ai template gratuiti finché non alzi la soglia qui sotto o non inizia il mese prossimo (si azzera da solo).
            </p>
          )}
          <ServiceLimitsForm
            servizio="anthropic"
            limite={anthropic.limiteChiamateMese}
            sogliaPercentualePausa={anthropic.sogliaPercentualePausa}
            pausato={pausatoAnthropic}
          />
        </>
      ) : (
        <p className="note mt-sm">
          Ancora nessuna chiamata registrata questo mese: se <code>ANTHROPIC_API_KEY</code> è impostata nei secrets di GitHub Actions,
          comparirà qui alla prima didascalia scritta con la visione; se non è impostata, il sistema usa i template scritti a mano, zero
          costo.
        </p>
      )}
    </div>
  );

  const metaTab = (
    <div className="card mt-md">
      <div className="flex-between">
        <div className="label">Token Facebook/Instagram</div>
        {tokenMeta.errore && <StatusBadge label="Non valido" tone="err" />}
      </div>

      {!tokenMeta.configurato && (
        <p className="note mt-sm">
          <code>META_APP_ID</code>/<code>META_APP_SECRET</code>/<code>META_PAGE_ACCESS_TOKEN</code> non sono impostati su Vercel, quindi
          da qui non posso controllare la scadenza. Gli agenti pubblicano comunque regolarmente usando le loro credenziali su GitHub
          Actions: questo riguarda solo il controllo e il rinnovo da questa dashboard.
        </p>
      )}

      {tokenMeta.configurato && tokenMeta.errore && (
        <p className="error-msg mt-sm">
          Il token attuale non è valido o è scaduto: {tokenMeta.errore}. Rinnovalo subito per non interrompere le pubblicazioni.
        </p>
      )}

      {tokenMeta.configurato && !tokenMeta.errore && tokenMeta.permanente && (
        <p className="note mt-sm">Token valido, senza scadenza. Nessuna azione necessaria.</p>
      )}

      {tokenMeta.configurato && !tokenMeta.errore && !tokenMeta.permanente && giorniRimanenti !== null && (
        <div className="stat-with-ring mt-sm">
          <ProgressRing
            percentage={Math.max(0, Math.min(100, (giorniRimanenti / 60) * 100))}
            color={coloreToken}
            label={`${giorniRimanenti}g`}
            sublabel="rimanenti"
          />
          <div className="stat-with-ring__details">
            <p className="note mt-sm">
              Scade il {new Date(tokenMeta.scadeIl!).toLocaleString("it-IT")} ({giorniRimanenti} giorni da oggi).
            </p>
            {giorniRimanenti <= 21 && (
              <p className="note">Meglio rinnovarlo ora, prima che scada e le pubblicazioni si blocchino.</p>
            )}
          </div>
        </div>
      )}

      <a href="/api/meta-token/start" className="btn btn--primary mt-md" style={{ display: "inline-flex" }}>
        Rinnova token ora
      </a>
      <p className="note mt-sm">
        Ti porta al login Facebook per confermare l&apos;accesso alla Pagina; una volta confermato, il nuovo token viene salvato da solo.
      </p>

      <h3 className="mt-lg">Altri servizi</h3>
      <div className="grid">
        <div className="card">
          <div className="label">GitHub Actions (agenti, montaggio Reel)</div>
          <p className="note">Repository pubblico → minuti di Actions illimitati e gratuiti. Nessun rischio di costo qui.</p>
        </div>
        <div className="card">
          <div className="label">Vercel (dashboard)</div>
          <p className="note">
            Piano gratuito: 100GB di banda e ampio margine di esecuzioni al mese, più che sufficiente per uso personale. Non c&apos;è
            un&apos;API semplice per leggerne l&apos;uso reale da qui — controllalo su{" "}
            <a href="https://vercel.com/dashboard/usage" target="_blank" rel="noreferrer">vercel.com → Usage</a> se vuoi essere sicuro.
          </p>
        </div>
        <div className="card">
          <div className="label">Meta Graph API (Instagram/Facebook)</div>
          <p className="note">Gratuita entro i limiti standard della piattaforma (non un costo a consumo): nessuna soglia da monitorare qui.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        icon={<Gauge size={22} aria-hidden="true" />}
        title="Utilizzo servizi"
        description="Ogni servizio usato dal sistema ha un piano gratuito (o quasi). Qui tieni d'occhio quanto ne stai usando, imposti una soglia di sicurezza e — dove è possibile misurarlo in automatico — il sistema si mette in pausa da solo prima di rischiare un costo, e riparte da solo quando torni sotto soglia."
      />

      <Tabs
        items={[
          { id: "r2", label: "Storage R2", content: r2Tab },
          { id: "anthropic", label: "API Anthropic", content: anthropicTab },
          { id: "meta", label: "Account Meta", content: metaTab }
        ]}
      />
    </div>
  );
}
