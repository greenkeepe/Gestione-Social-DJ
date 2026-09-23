// Agente "Editore" — pubblica su Instagram e Facebook SOLO quando l'orario
// corrente è vicino all'orario programmato per il contenuto pronto in coda,
// ed evita doppie pubblicazioni nello stesso giorno. Pensato per essere
// eseguito più volte al giorno (vedi .github/workflows/publish-check.yml)
// così da "trovare" l'orario migliore invece di pubblicare a un'ora fissa.
import "dotenv/config";
import { readData, writeData, nowIso } from "../lib/storage.js";
import { logAgentRun } from "../lib/agentLog.js";
import { pubblicaSuInstagram, pubblicaSuFacebook, pubblicaStoriesSuInstagram } from "../lib/metaGraph.js";
import { inviaMessaggioTelegram, inviaMediaTelegram } from "../lib/telegram.js";
import { IDENTITA } from "./identities.js";

interface PostsQueueFile {
  _istruzioni: string;
  queue: Array<{
    id: string;
    formato: string;
    status: string;
    caption: string | null;
    hashtags: string[];
    orarioProgrammato: string | null;
    dataProgrammata?: string | null;
    media: { downloadUrl: string; mimeType: string };
    pillarId?: string;
    ultimoErrore?: string | null;
    tentativiFalliti?: number;
  }>;
}

interface PublishedLogFile {
  _istruzioni: string;
  log: Array<Record<string, unknown>>;
}

// I trigger "schedule" di GitHub Actions su questo repository arrivano
// regolarmente in ritardo di 2-5 ore (visto dal vivo più volte: un
// controllo delle 19:00 può partire davvero solo alle 21:29) — limite
// noto di GitHub sui repository con poca attività continua, non
// risolvibile lato nostro. Una finestra di 90 minuti perdeva quindi quasi
// sempre la pubblicazione. Allargata per assorbire il ritardo tipico
// osservato, restando comunque "lo stesso giorno".
const FINESTRA_TOLLERANZA_MINUTI = 300;

function siamoNellaFinestra(orarioProgrammato: string): boolean {
  const ora = new Date();
  const [hh, mm] = orarioProgrammato.split(":").map(Number);
  const target = new Date(ora);
  target.setHours(hh, mm, 0, 0);
  const diffMinuti = (ora.getTime() - target.getTime()) / 60000;
  // pubblichiamo se siamo AL o DOPO l'orario target, ma entro la finestra di tolleranza
  return diffMinuti >= 0 && diffMinuti <= FINESTRA_TOLLERANZA_MINUTI;
}

export async function eseguiPublishingAgent(): Promise<void> {
  try {
    const queueFile = await readData<PostsQueueFile>("posts-queue.json");
    const logFile = await readData<PublishedLogFile>("published-log.json");
    const oggi = new Date().toISOString().slice(0, 10);

    // FORCE_PUBLISH_QUEUE_ID: pubblica SUBITO un contenuto specifico, ignorando
    // sia il limite "1 al giorno" sia la finestra oraria — usato solo per test
    // manuali voluti esplicitamente (dashboard/workflow_dispatch), mai dal
    // ciclo schedulato normale. Richiede l'id esatto del contenuto: nessun
    // rischio di doppie pubblicazioni accidentali sul resto della coda.
    const forzaQueueId = process.env.FORCE_PUBLISH_QUEUE_ID?.trim() || null;

    // Un contenuto "pubblicato-parziale" (una piattaforma è andata, l'altra no,
    // es. permesso mancante) non deve restare bloccato per sempre: la ricerca
    // di un "pronto" qui sotto non lo troverebbe mai più. Ritenta SOLO la
    // piattaforma mancante, ignorando il limite di 1/giorno (non è una nuova
    // pubblicazione, il contenuto è già uscito almeno in parte).
    const parziale = queueFile.queue.find(
      (p) => p.status === "pubblicato-parziale" && (!forzaQueueId || p.id === forzaQueueId)
    );
    if (parziale) {
      await riprovaPubblicazioneParziale(parziale, queueFile, logFile);
      return;
    }

    // Due "canali" separati, non un unico limite "1 pubblicazione al
    // giorno" in totale: al massimo 1 post evento (foto/reel/testimonianza)
    // + 1 post "sito" (agents/sito-agent.ts) al giorno. Un contenuto sito
    // non ruba mai il turno a uno evento e viceversa — ognuno ha il suo
    // conteggio "già pubblicato oggi" indipendente.
    const categoriaDi = (formato: unknown) => (formato === "sito" ? "sito" : "evento");
    const categorieGiaPubblicateOggi = new Set(
      logFile.log
        .filter((p) => typeof p.timestamp === "string" && p.timestamp.startsWith(oggi))
        .map((p) => categoriaDi(p.formato))
    );

    // Solo i contenuti il cui giorno programmato è oggi o già passato sono
    // pubblicabili adesso: un contenuto pianificato per un giorno futuro
    // (vedi lib/bestTime.ts > pianificaProssimaPubblicazione, che spalmA il
    // caricamento massivo di più foto/video su giorni diversi) deve
    // aspettare il suo turno, non uscire in anticipo solo perché è il primo
    // della coda con un orario che combacia con l'ora attuale. Tra i
    // contenuti eleggibili si prende sempre quello con la data più vecchia
    // (mai quello con la data più lontana, anche se più avanti nell'array).
    const target = forzaQueueId
      ? queueFile.queue.find((p) => p.id === forzaQueueId && p.status === "pronto")
      : queueFile.queue
          .filter(
            (p) =>
              p.status === "pronto" &&
              p.orarioProgrammato &&
              (!p.dataProgrammata || p.dataProgrammata <= oggi) &&
              !categorieGiaPubblicateOggi.has(categoriaDi(p.formato))
          )
          .sort((a, b) => (a.dataProgrammata ?? "").localeCompare(b.dataProgrammata ?? ""))[0];
    if (!target) {
      await logAgentRun({
        agente: IDENTITA.publishing.nome,
        identita: IDENTITA.publishing.ruolo,
        status: "nessuna-azione",
        riepilogo: forzaQueueId
          ? `Pubblicazione forzata richiesta per un id (${forzaQueueId}) non trovato o non pronto.`
          : "Nessun contenuto pronto da pubblicare oggi (o già pubblicato il massimo per i canali disponibili)."
      });
      return;
    }

    // Un contenuto rimasto indietro rispetto al giorno programmato (es. un
    // ciclo saltato) va pubblicato appena possibile, senza aspettare che
    // l'orologio ripassi esattamente dall'orario originale: quel controllo
    // ha senso solo per un contenuto programmato per la giornata odierna.
    const inRitardo = Boolean(target.dataProgrammata && target.dataProgrammata < oggi);
    if (!forzaQueueId && !inRitardo && !siamoNellaFinestra(target.orarioProgrammato!)) {
      await logAgentRun({
        agente: IDENTITA.publishing.nome,
        identita: IDENTITA.publishing.ruolo,
        status: "nessuna-azione",
        riepilogo: `In attesa dell'orario migliore (${target.orarioProgrammato}) per pubblicare.`
      });
      return;
    }

    const isVideo = target.media.mimeType.startsWith("video/");
    const caption = `${target.caption ?? ""}\n\n${(target.hashtags ?? []).join(" ")}`.trim();

    // Instagram e Facebook sono chiamati SEPARATAMENTE (mai il secondo dentro
    // lo stesso try del primo): se una delle due piattaforme fallisce dopo che
    // l'altra è già andata a buon fire, quel post è REALMENTE uscito e non va
    // mai più ritentato, altrimenti al ciclo successivo lo pubblicheremmo una
    // seconda volta sulla piattaforma che aveva già funzionato.
    let risultatoIg: { id: string } | null = null;
    let erroreIg: string | null = null;
    try {
      risultatoIg = await pubblicaSuInstagram({
        imageUrl: isVideo ? undefined : target.media.downloadUrl,
        videoUrl: isVideo ? target.media.downloadUrl : undefined,
        isReel: target.formato === "reel",
        caption
      });
    } catch (err) {
      erroreIg = err instanceof Error ? err.message : String(err);
    }

    // Storia Instagram con lo stesso media: best-effort, non deve mai far
    // fallire la pubblicazione principale (il post è già uscito o ha già
    // fallito indipendentemente da questo). Tiene il profilo attivo tra un
    // post e l'altro senza affollare il feed.
    let storiaIg: { id: string } | null = null;
    if (risultatoIg) {
      try {
        storiaIg = await pubblicaStoriesSuInstagram({
          imageUrl: isVideo ? undefined : target.media.downloadUrl,
          videoUrl: isVideo ? target.media.downloadUrl : undefined
        });
      } catch (err) {
        console.error("[Editore] Pubblicazione Storia Instagram fallita (non bloccante):", err);
      }
    }

    let risultatoFb: { id: string } | null = null;
    let erroreFb: string | null = null;
    try {
      risultatoFb = await pubblicaSuFacebook({
        message: caption,
        imageUrl: isVideo ? undefined : target.media.downloadUrl,
        videoUrl: isVideo ? target.media.downloadUrl : undefined
      });
    } catch (err) {
      erroreFb = err instanceof Error ? err.message : String(err);
    }

    if (!risultatoIg && !risultatoFb) {
      // Nessuna pubblicazione è uscita davvero: il contenuto resta "pronto"
      // e si può ritentare tranquillamente al prossimo ciclo. Salviamo
      // comunque l'errore sul contenuto stesso (non solo nel log agenti):
      // così la pagina "Contenuti" può segnalarlo ed è facile da eliminare
      // se è un errore permanente (es. media cancellato da R2) invece di
      // continuare a ritentarlo in eterno bloccando la coda.
      const messaggioErrore = `Instagram: ${erroreIg}. Facebook: ${erroreFb}`;
      target.tentativiFalliti = (target.tentativiFalliti ?? 0) + 1;
      target.ultimoErrore = messaggioErrore;
      await writeData("posts-queue.json", queueFile);
      throw new Error(messaggioErrore);
    }

    // Almeno una pubblicazione è uscita: il contenuto NON deve più tornare
    // "pronto", altrimenti verrebbe ripubblicato in doppione sulla
    // piattaforma che ha già funzionato.
    target.status = risultatoIg && risultatoFb ? "pubblicato" : "pubblicato-parziale";
    target.ultimoErrore = null;
    target.tentativiFalliti = 0;

    logFile.log.unshift({
      queueId: target.id,
      timestamp: nowIso(),
      instagramId: risultatoIg?.id ?? null,
      facebookId: risultatoFb?.id ?? null,
      instagramStoryId: storiaIg?.id ?? null,
      formato: target.formato,
      pillarId: target.pillarId ?? null,
      hashtags: target.hashtags ?? [],
      punteggio: null
    });
    await writeData("published-log.json", logFile);
    await writeData("posts-queue.json", queueFile);

    const completo = Boolean(risultatoIg && risultatoFb);
    const dettaglioIg = risultatoIg ? `Instagram OK (${risultatoIg.id})` : `Instagram FALLITO: ${erroreIg}`;
    const dettaglioFb = risultatoFb ? `Facebook OK (${risultatoFb.id})` : `Facebook FALLITO: ${erroreFb}`;
    const dettaglioStoria = risultatoIg ? (storiaIg ? " + Storia IG pubblicata." : " (Storia IG non riuscita, non bloccante.)") : "";

    await logAgentRun({
      agente: IDENTITA.publishing.nome,
      identita: IDENTITA.publishing.ruolo,
      status: completo ? "ok" : "errore",
      riepilogo: completo
        ? `Pubblicato su Instagram (${risultatoIg!.id}) e Facebook (${risultatoFb!.id}).${dettaglioStoria}`
        : `Pubblicazione PARZIALE, richiede la tua attenzione — ${dettaglioIg}; ${dettaglioFb}${dettaglioStoria}`
    });

    // Manda il media appena pubblicato con la sua didascalia reale: così vedi
    // subito COSA è uscito, non solo che è uscito. Best-effort: se fallisce
    // (es. Telegram non riesce a scaricare l'URL) non blocca nulla, il testo
    // di stato qui sotto arriva comunque.
    if (risultatoIg || risultatoFb) {
      await inviaMediaTelegram({ url: target.media.downloadUrl, isVideo, caption });
    }

    const notaStoria = storiaIg ? "\n📱 + Storia Instagram pubblicata." : "";
    await inviaMessaggioTelegram(
      completo
        ? `✅ Pubblicato su Instagram (${risultatoIg!.id}) e Facebook (${risultatoFb!.id})!${notaStoria}`
        : `⚠️ Pubblicazione parziale, dai un'occhiata alla dashboard:\n${dettaglioIg}\n${dettaglioFb}${notaStoria}`
    );
  } catch (err) {
    await logAgentRun({
      agente: IDENTITA.publishing.nome,
      identita: IDENTITA.publishing.ruolo,
      status: "errore",
      riepilogo: "Errore imprevisto nell'Agente Pubblicazione. Il contenuto resta in coda per il prossimo tentativo.",
      dettagli: { errore: String(err) }
    });
    await inviaMessaggioTelegram(`⚠️ Errore nella pubblicazione automatica: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Ritenta SOLO la piattaforma rimasta indietro di un contenuto già uscito in
// parte (es. Instagram OK, Facebook fallito per un permesso mancante nel
// frattempo risolto). Non ripubblica mai la piattaforma già andata a buon
// fine, quindi nessun rischio di doppioni.
async function riprovaPubblicazioneParziale(
  target: PostsQueueFile["queue"][number],
  queueFile: PostsQueueFile,
  logFile: PublishedLogFile
): Promise<void> {
  const voce = logFile.log.find((v) => v.queueId === target.id) as
    | { instagramId: string | null; facebookId: string | null; instagramStoryId?: string | null }
    | undefined;
  if (!voce) {
    await logAgentRun({
      agente: IDENTITA.publishing.nome,
      identita: IDENTITA.publishing.ruolo,
      status: "errore",
      riepilogo: `Contenuto "pubblicato-parziale" (${target.id}) senza voce corrispondente in published-log.json: serve un controllo manuale.`
    });
    return;
  }

  const isVideo = target.media.mimeType.startsWith("video/");
  const caption = `${target.caption ?? ""}\n\n${(target.hashtags ?? []).join(" ")}`.trim();

  let nuovoErrore: string | null = null;
  let piattaforma = "";

  if (!voce.instagramId) {
    piattaforma = "Instagram";
    try {
      const risultato = await pubblicaSuInstagram({
        imageUrl: isVideo ? undefined : target.media.downloadUrl,
        videoUrl: isVideo ? target.media.downloadUrl : undefined,
        isReel: target.formato === "reel",
        caption
      });
      voce.instagramId = risultato.id;
      try {
        const storia = await pubblicaStoriesSuInstagram({
          imageUrl: isVideo ? undefined : target.media.downloadUrl,
          videoUrl: isVideo ? target.media.downloadUrl : undefined
        });
        voce.instagramStoryId = storia.id;
      } catch (err) {
        console.error("[Editore] Storia Instagram (recupero) fallita, non bloccante:", err);
      }
    } catch (err) {
      nuovoErrore = err instanceof Error ? err.message : String(err);
    }
  } else if (!voce.facebookId) {
    piattaforma = "Facebook";
    try {
      const risultato = await pubblicaSuFacebook({
        message: caption,
        imageUrl: isVideo ? undefined : target.media.downloadUrl,
        videoUrl: isVideo ? target.media.downloadUrl : undefined
      });
      voce.facebookId = risultato.id;
    } catch (err) {
      nuovoErrore = err instanceof Error ? err.message : String(err);
    }
  } else {
    // Entrambi gli id erano già presenti: lo stato non era coerente col log, lo sistemiamo senza ripubblicare nulla.
    target.status = "pubblicato";
    await writeData("posts-queue.json", queueFile);
    await logAgentRun({
      agente: IDENTITA.publishing.nome,
      identita: IDENTITA.publishing.ruolo,
      status: "ok",
      riepilogo: `Contenuto (${target.id}) era segnato "pubblicato-parziale" ma entrambe le piattaforme risultavano già a posto: stato corretto.`
    });
    return;
  }

  await writeData("published-log.json", logFile);

  if (nuovoErrore) {
    target.tentativiFalliti = (target.tentativiFalliti ?? 0) + 1;
    target.ultimoErrore = `${piattaforma}: ${nuovoErrore}`;
    await writeData("posts-queue.json", queueFile);
    await logAgentRun({
      agente: IDENTITA.publishing.nome,
      identita: IDENTITA.publishing.ruolo,
      status: "errore",
      riepilogo: `Nuovo tentativo su ${piattaforma} ancora fallito: ${nuovoErrore}`
    });
    await inviaMessaggioTelegram(`⚠️ Ritento ${piattaforma} per un post parziale ma fallisce ancora: ${nuovoErrore}`);
    return;
  }

  const oraCompleto = Boolean(voce.instagramId && voce.facebookId);
  target.status = oraCompleto ? "pubblicato" : "pubblicato-parziale";
  target.ultimoErrore = null;
  target.tentativiFalliti = 0;
  await writeData("posts-queue.json", queueFile);

  await logAgentRun({
    agente: IDENTITA.publishing.nome,
    identita: IDENTITA.publishing.ruolo,
    status: "ok",
    riepilogo: `Recuperata la pubblicazione mancante su ${piattaforma}.${oraCompleto ? " Ora pubblicato su entrambe le piattaforme." : ""}`
  });
  await inviaMessaggioTelegram(
    oraCompleto
      ? `✅ Recuperato! Ora pubblicato anche su ${piattaforma}: il post è live su Instagram e Facebook.`
      : `✅ Recuperata la pubblicazione su ${piattaforma}.`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  eseguiPublishingAgent();
}
