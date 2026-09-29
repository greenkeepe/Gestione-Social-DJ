import Link from "next/link";
import { LayoutDashboard, Camera, ThumbsUp, MessageSquare, Heart, Inbox, Clapperboard, LayoutGrid, AlertTriangle, CalendarCheck } from "lucide-react";
import { leggiDati } from "../../lib/dataSource";
import { calcolaProssimiInvii } from "../../lib/prossimoInvioOutreach";
import type {
  KpisFile, AgentRunsFile, StrategyFile, PostsQueueFile, PublishedLogFile, ReelJobsFile, OutreachFile, OutreachConfigFile
} from "../../lib/types";
import { ProgressRing } from "../../components/ProgressRing";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { statusVocabulary } from "../../lib/statusVocabulary";

export const dynamic = "force-dynamic";

interface MediaLibraryFile {
  items: Array<{ usatoIl: string | null; source?: string }>;
}

const dataRoma = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(d); // AAAA-MM-GG
const oraRoma = (d: Date) => d.toLocaleTimeString("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" });

export default async function Panoramica() {
  const [kpis, agentRuns, strategy, media, queueFile, publishedFile, reelJobs, locali, localiConfig] = await Promise.all([
    leggiDati<KpisFile>("kpis.json"),
    leggiDati<AgentRunsFile>("agent-runs.json"),
    leggiDati<StrategyFile>("strategy-2027.json"),
    leggiDati<MediaLibraryFile>("media-library.json"),
    leggiDati<PostsQueueFile>("posts-queue.json"),
    leggiDati<PublishedLogFile>("published-log.json"),
    leggiDati<ReelJobsFile>("reel-jobs.json"),
    leggiDati<OutreachFile>("outreach-locali.json").catch((): OutreachFile => ({ contatti: [] })),
    leggiDati<OutreachConfigFile>("outreach-config.json").catch((): OutreachConfigFile => ({ province: [] }))
  ]);

  // ---- "Oggi": quello che succede oggi, in un colpo d'occhio ----
  const adesso = new Date();
  const oggi = dataRoma(adesso);
  const usciteOggi = publishedFile.log.filter((p) => dataRoma(new Date(p.timestamp)) === oggi);
  const inUscitaOggi = queueFile.queue
    .filter((q) => q.status === "pronto" && q.dataProgrammata && q.dataProgrammata <= oggi)
    .sort((a, b) => `${a.dataProgrammata} ${a.orarioProgrammato}`.localeCompare(`${b.dataProgrammata} ${b.orarioProgrammato}`));
  const prossimoPost = queueFile.queue
    .filter((q) => q.status === "pronto" && q.dataProgrammata && q.dataProgrammata > oggi)
    .sort((a, b) => `${a.dataProgrammata} ${a.orarioProgrammato}`.localeCompare(`${b.dataProgrammata} ${b.orarioProgrammato}`))[0];
  const mailInviateOggi = locali.contatti.filter((c) => c.status === "inviata" && c.inviataIl && dataRoma(new Date(c.inviataIl)) === oggi).length;
  const invioAuto = localiConfig.invioAutomatico;
  const prossimiInvii = invioAuto?.attivo ? calcolaProssimiInvii(locali.contatti, invioAuto.maxAlGiorno, adesso) : [];
  const mailInPartenza = prossimiInvii.filter((p) => dataRoma(p.previstoIl) === dataRoma(prossimiInvii[0]?.previstoIl ?? adesso));
  const bozzeLocali = locali.contatti.filter((c) => c.status === "bozza-da-rivedere").length;
  const videoInMontaggio = reelJobs.jobs.filter((j) => j.status === "in-coda-analisi").length;
  const regiaAlLavoro = queueFile.queue.filter((q) => q.regiaRichiesta && q.status !== "pubblicato" && q.status !== "pubblicato-parziale").length;
  const senzaDidascalia = queueFile.queue.filter((q) => q.status === "in-coda-caption").length;

  const percentuale = Math.min(
    100,
    Math.round((kpis.obiettivo2027.matrimoniConfermati / kpis.obiettivo2027.matrimoniTarget) * 100)
  );
  const ultimeAzioni = agentRuns.runs.slice(0, 8);

  // Visione globale: tutto quello che sta succedendo nella pipeline, dal
  // media grezzo alla pubblicazione, in un solo colpo d'occhio.
  const mediaInAttesa = media.items.filter((m) => m.usatoIl === null).length;
  const reelInElaborazione = reelJobs.jobs.filter((j) => j.status === "in-coda-analisi").length;
  const inPausaOErrore = queueFile.queue.filter((q) => q.status.startsWith("in-pausa") || q.status === "errore").length;
  const inCoda = queueFile.queue.filter((q) => q.status !== "pubblicato" && q.status !== "pubblicato-parziale").length;
  const ultimoPubblicato = publishedFile.log[0] ?? null;

  // Agenti il cui ultimo giro è finito in errore (con quanti errori di fila):
  // in cima alla pagina, così un problema non resta nascosto per giorni.
  const problemi: Array<{ agente: string; identita: string; errori: number; riepilogo: string; timestamp: string }> = [];
  for (const agente of new Set(agentRuns.runs.map((r) => r.agente))) {
    const suoi = agentRuns.runs.filter((r) => r.agente === agente);
    if (suoi[0]?.status !== "errore") continue;
    const primoNonErrore = suoi.findIndex((r) => r.status !== "errore");
    problemi.push({
      agente,
      identita: suoi[0].identita,
      errori: primoNonErrore === -1 ? suoi.length : primoNonErrore,
      riepilogo: suoi[0].riepilogo,
      timestamp: suoi[0].timestamp
    });
  }

  return (
    <div>
      <PageHeader
        icon={<LayoutDashboard size={22} aria-hidden="true" />}
        title="Panoramica"
        description={`Ultimo aggiornamento dati: ${kpis.ultimoAggiornamento ? new Date(kpis.ultimoAggiornamento).toLocaleString("it-IT") : "in attesa del primo ciclo agenti"}`}
      />

      {problemi.length > 0 && (
        <div className="card card--allarme">
          <div className="label">
            <AlertTriangle size={16} aria-hidden="true" /> Da controllare
          </div>
          {problemi.map((p) => (
            <p key={p.agente} className="note">
              <strong>
                {p.agente} ({p.identita})
              </strong>
              {p.errori > 1 ? ` · ${p.errori} errori di fila` : " · ultimo giro in errore"} ·{" "}
              {new Date(p.timestamp).toLocaleString("it-IT", { timeZone: "Europe/Rome", dateStyle: "short", timeStyle: "short" })} — {p.riepilogo}
            </p>
          ))}
          <p className="note">Si toglie da solo quando l&apos;agente torna a funzionare. Dopo 2 errori di fila arriva anche un avviso su Telegram.</p>
        </div>
      )}

      <div className="card oggi">
        <div className="label">
          <CalendarCheck size={16} aria-hidden="true" /> Oggi
        </div>
        <div className="oggi__colonne">
          <div>
            <strong>Social</strong>
            {usciteOggi.map((p, i) => (
              <p key={`u${i}`} className="note">✅ Uscito alle {oraRoma(new Date(p.timestamp))} · {p.formato}</p>
            ))}
            {inUscitaOggi.map((q) => (
              <p key={q.id} className="note">
                ⏰ {q.dataProgrammata! < oggi ? "in ritardo, esce appena possibile" : `esce alle ${q.orarioProgrammato}`} · {q.formato === "reel" ? "Reel" : "Post"}
              </p>
            ))}
            {usciteOggi.length === 0 && inUscitaOggi.length === 0 && <p className="note">Nessun post previsto oggi.</p>}
            {prossimoPost && (
              <p className="note">
                Prossimo: {new Date(`${prossimoPost.dataProgrammata}T00:00:00`).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })} alle{" "}
                {prossimoPost.orarioProgrammato}
              </p>
            )}
            <p className="note"><Link href="/anteprima">Apri Anteprima →</Link></p>
          </div>
          <div>
            <strong>Mail ai locali</strong>
            {mailInviateOggi > 0 && <p className="note">✅ {mailInviateOggi} inviate oggi</p>}
            {!invioAuto?.attivo && <p className="note">Invio automatico spento.</p>}
            {invioAuto?.attivo && mailInPartenza.length > 0 && (
              <p className="note">
                ✉️ {mailInPartenza.length} in partenza {dataRoma(mailInPartenza[0].previstoIl) === oggi ? "oggi" : "domani"} verso le{" "}
                {oraRoma(mailInPartenza[0].previstoIl)}
              </p>
            )}
            {invioAuto?.attivo && mailInPartenza.length === 0 && <p className="note">Nessuna bozza pronta: l&apos;Esploratore ne prepara di nuove domattina.</p>}
            <p className="note">
              {bozzeLocali} bozze da rivedere · <Link href="/locali">Apri Locali →</Link>
            </p>
          </div>
          <div>
            <strong>In lavorazione</strong>
            <p className="note">🎬 Video in montaggio: {videoInMontaggio}</p>
            {regiaAlLavoro > 0 && <p className="note">🎞️ Rielaborazioni Regia: {regiaAlLavoro}</p>}
            <p className="note">✍️ In attesa di didascalia: {senzaDidascalia}</p>
            <p className="note"><Link href="/carica">Carica foto o video →</Link></p>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="card card--stat">
          <div className="stat-top">
            <div className="label">Follower Instagram</div>
            <Camera className="stat-icon" size={18} aria-hidden="true" />
          </div>
          <div className="value">{kpis.instagram.followers ?? "—"}</div>
          {kpis.instagram.followersTrend7g !== null && (
            <span className={`trend ${kpis.instagram.followersTrend7g >= 0 ? "trend--up" : "trend--down"}`}>
              {kpis.instagram.followersTrend7g >= 0 ? "▲" : "▼"} {Math.abs(kpis.instagram.followersTrend7g)} (7g)
            </span>
          )}
        </div>
        <div className="card card--stat">
          <div className="stat-top">
            <div className="label">Follower Facebook</div>
            <ThumbsUp className="stat-icon" size={18} aria-hidden="true" />
          </div>
          <div className="value">{kpis.facebook.followers ?? "—"}</div>
        </div>
        <div className="card card--stat">
          <div className="stat-top">
            <div className="label">Lead attivi</div>
            <MessageSquare className="stat-icon" size={18} aria-hidden="true" />
          </div>
          <div className="value">{kpis.obiettivo2027.leadAttivi}</div>
        </div>
        <div className="card card--stat">
          <div className="stat-top">
            <div className="label">Matrimoni confermati 2027</div>
            <Heart className="stat-icon" size={18} aria-hidden="true" />
          </div>
          <div className="value">{kpis.obiettivo2027.matrimoniConfermati} / {kpis.obiettivo2027.matrimoniTarget}</div>
          <div className="progress-bar">
            <div style={{ width: `${percentuale}%` }} />
          </div>
        </div>
      </div>

      <h3>Pipeline contenuti — visione globale</h3>
      <div className="grid">
        <div className="card card--stat">
          <div className="stat-top">
            <div className="label">Media in attesa (foto/video da caricare)</div>
            <Inbox className="stat-icon" size={18} aria-hidden="true" />
          </div>
          <div className="value">{mediaInAttesa}</div>
        </div>
        <div className="card card--stat">
          <div className="stat-top">
            <div className="label">Reel in montaggio AI</div>
            <Clapperboard className="stat-icon" size={18} aria-hidden="true" />
          </div>
          <div className="value">{reelInElaborazione}</div>
        </div>
        <div className="card card--stat">
          <div className="stat-top">
            <div className="label">Contenuti in coda (tutti gli stati)</div>
            <LayoutGrid className="stat-icon" size={18} aria-hidden="true" />
          </div>
          <div className="value">{inCoda}</div>
        </div>
        <div className="card card--stat">
          <div className="stat-top">
            <div className="label">In pausa / in errore (richiedono attenzione)</div>
            <AlertTriangle className="stat-icon" size={18} aria-hidden="true" />
          </div>
          <div className="value">{inPausaOErrore}</div>
        </div>
      </div>
      <p className="note">
        Ultima pubblicazione:{" "}
        {ultimoPubblicato
          ? `${ultimoPubblicato.formato} il ${new Date(ultimoPubblicato.timestamp).toLocaleString("it-IT")}`
          : "nessuna ancora"}
        . Dettagli completi nella pagina <a href="/contenuti">Contenuti</a>, foto e video caricati in <a href="/carica">Carica</a>.
      </p>

      <div className="card">
        <div className="stat-with-ring">
          <ProgressRing percentage={percentuale} color="var(--color-accent)" sublabel="obiettivo 2027" />
          <div className="stat-with-ring__details">
            <div className="label">Obiettivo: {strategy.obiettivo}</div>
            <div className="progress-bar">
              <div style={{ width: `${percentuale}%` }} />
            </div>
            <p className="note">{percentuale}% completato — fase corrente: {strategy.progresso.faseCorrente}</p>
          </div>
        </div>
      </div>

      <h3>Ultime azioni degli agenti</h3>
      <table>
        <thead>
          <tr><th>Agente</th><th>Esito</th><th>Riepilogo</th><th>Quando</th></tr>
        </thead>
        <tbody>
          {ultimeAzioni.length === 0 && (
            <tr><td colSpan={4} className="note">Nessuna esecuzione ancora registrata. Gli agenti partiranno al primo ciclo pianificato (o lanciali manualmente da GitHub Actions).</td></tr>
          )}
          {ultimeAzioni.map((r, i) => (
            <tr key={i}>
              <td>{r.agente}</td>
              <td><StatusBadge {...statusVocabulary.agentRun(r.status)} /></td>
              <td>{r.riepilogo}</td>
              <td>{new Date(r.timestamp).toLocaleString("it-IT")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
