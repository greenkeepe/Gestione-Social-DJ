import { leggiDati } from "../../../lib/dataSource";
import { ServiceLimitsForm } from "../../../components/ServiceLimitsForm";

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

  const percentualeR2 = r2.limiteBytes > 0 ? Math.min(100, (r2.usoAttualeBytes / r2.limiteBytes) * 100) : 0;
  const pausatoR2 = r2.pausatoIl !== null;

  const percentualeAnthropic = anthropic.limiteChiamateMese > 0 ? Math.min(100, (anthropic.chiamateEffettuateMese / anthropic.limiteChiamateMese) * 100) : 0;
  const pausatoAnthropic = anthropic.pausatoIl !== null;
  const anthropicConfigurata = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div>
      <h2>Utilizzo servizi</h2>
      <p className="note">
        Ogni servizio usato dal sistema ha un piano gratuito (o quasi). Qui tieni d&apos;occhio quanto ne stai usando, imposti una soglia di
        sicurezza e — dove è possibile misurarlo in automatico — il sistema si mette in pausa da solo prima di rischiare un costo, e riparte
        da solo quando torni sotto soglia.
      </p>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div className="label">{r2.nome}</div>
          {pausatoR2 && <span className="badge errore">⏸️ In pausa</span>}
        </div>
        <div className="progress-bar" style={{ marginTop: 10 }}>
          <div style={{ width: `${percentualeR2}%`, background: percentualeR2 >= r2.sogliaPercentualePausa ? "#c0392b" : undefined }} />
        </div>
        <p className="note" style={{ marginTop: 6 }}>
          {formattaGb(r2.usoAttualeBytes)} / {formattaGb(r2.limiteBytes)} ({percentualeR2.toFixed(1)}%) — {r2.oggettiAttuali} file
        </p>
        <p className="note">
          {r2.aggiornatoIl ? `Ultima misurazione: ${new Date(r2.aggiornatoIl).toLocaleString("it-IT")}` : "Non ancora misurato: attendi il prossimo ciclo agenti."}
        </p>
        {pausatoR2 && (
          <p className="error-msg">
            Caricamento di nuovi media (Telegram e dashboard) in pausa da{" "}
            {r2.pausatoIl ? new Date(r2.pausatoIl).toLocaleString("it-IT") : ""}. Elimina media che non ti servono più dalla pagina{" "}
            <a href="/carica">Carica media</a> per liberare spazio, oppure alza la soglia qui sotto.
          </p>
        )}
        <ServiceLimitsForm servizio="r2" limite={r2.limiteBytes} sogliaPercentualePausa={r2.sogliaPercentualePausa} pausato={pausatoR2} />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div className="label">{anthropic.nome}</div>
          {pausatoAnthropic && <span className="badge errore">⏸️ In pausa</span>}
        </div>
        {anthropicConfigurata ? (
          <>
            <div className="progress-bar" style={{ marginTop: 10 }}>
              <div
                style={{
                  width: `${percentualeAnthropic}%`,
                  background: percentualeAnthropic >= anthropic.sogliaPercentualePausa ? "#c0392b" : undefined
                }}
              />
            </div>
            <p className="note" style={{ marginTop: 6 }}>
              {anthropic.chiamateEffettuateMese} / {anthropic.limiteChiamateMese} chiamate ({percentualeAnthropic.toFixed(1)}%) — mese{" "}
              {anthropic.meseCorrente}
            </p>
            <p className="note">
              {anthropic.aggiornatoIl ? `Ultima chiamata: ${new Date(anthropic.aggiornatoIl).toLocaleString("it-IT")}` : "Ancora nessuna chiamata questo mese."}
            </p>
            <p className="note">Costo indicativo: pochi centesimi ogni 100 chiamate. Il conto reale è su console.anthropic.com.</p>
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
          <p className="note" style={{ marginTop: 6 }}>
            Non configurata: il sistema usa i template scritti a mano, zero costo, zero chiamate da misurare.
          </p>
        )}
      </div>

      <h3 style={{ marginTop: 24 }}>Altri servizi</h3>
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
}
