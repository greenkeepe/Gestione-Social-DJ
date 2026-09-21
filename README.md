# Gestione Social DJ — sistema multi-agente per Facebook & Instagram

Sistema di agenti autonomi che gestiscono la presenza social del tuo profilo DJ (matrimoni, eventi, party): pubblicano le foto/video che carichi dalla dashboard, individuano potenziali sposi interessati, tengono aggiornata una strategia verso l'obiettivo di **30 matrimoni nel 2027**, e tutto è controllabile da una dashboard raggiungibile da remoto. Costo attuale: **zero** (GitHub Actions + Vercel free tier).

## Sito pubblico (`site/`)

Oltre agli agenti (root) e alla dashboard privata (`dashboard/`), il repository contiene anche il sito vetrina pubblico di Forte DJ in `site/`: un progetto Next.js separato, online su **[www.fortedj.it](https://www.fortedj.it)** (deploy indipendente, attualmente su Netlify). Vedi `site/README.md` per contenuti, variabili d'ambiente e come popolare gallery/showreel con foto e video reali.

Il link è registrato in `config/brand.json > contatti.sitoWeb`: da lì lo leggono sia l'Agente Esploratore (firma delle email di collaborazione) sia l'Agente Contenuti, che può chiudere un post con un CTA "link in bio" (solo perché `sitoWebBottoneAttivo` è `true` — vero solo se il link è davvero impostato nel bio Instagram/Facebook, altrimenti sarebbe un invito a vuoto).

## Come è fatto il sistema

Un **Agente Master ("Direttore")** coordina ogni giorno 8 agenti specializzati, ciascuno con un ruolo preciso; un nono agente (il **Regista**) lavora in coda separata trasformando i video grezzi in Reel:

| Agente | Nome | Cosa fa |
|---|---|---|
| Media | **Occhio** | Sceglie il prossimo file caricato dalla pagina "Carica media" della dashboard, preferendo un video (Reel) quando disponibile — su Instagram ottengono molta più portata organica dei post statici |
| Contenuti | **Copy** | Scrive didascalia e hashtag seguendo il calendario editoriale e il tono di voce del brand. Nei giorni senza un tema fisso, e nella scelta degli hashtag, impara dai post già pubblicati quali pilastri/hashtag hanno portato più interazione reale (mai a scapito della varietà — vedi `lib/performanceLearning.ts`) |
| Pubblicazione | **Editore** | Pubblica su Instagram e Facebook nell'orario storicamente più efficace della giornata |
| Lead | **Cacciatore** | Individua chi ha commentato/interagito con interesse e prepara bozze di messaggi privati — **non invia mai nulla da solo** |
| Risposte | **Portavoce** | Risponde pubblicamente e in fretta ai nuovi commenti sugli ultimi post (mai in privato, mai prezzi/disponibilità): la conversazione attiva sotto un post ne aumenta la visibilità algoritmica |
| Note Instagram | **Appunti** | Propone ogni tanto su Telegram il testo di una Nota Instagram (max 60 caratteri) da incollare a mano — le Note non sono pubblicabili via API, nessuna eccezione possibile |
| Partnership locali | **Esploratore** | Su richiesta (tasto "Cerca nuovi locali" nella pagina "Locali", non più in automatico ogni giorno) trova fino a 10 ristoranti/hotel della zona con un'email pubblica e prepara una bozza di collaborazione — **non invia mai nulla da solo**, invii tu con un tap (vedi sezione dedicata sotto) |
| Analytics | **Analista** | Legge le statistiche da Meta, aggiorna i KPI e misura il punteggio reale (like/commenti/salvataggi/condivisioni pesati) dei post pubblicati da almeno 2 giorni, per alimentare l'apprendimento del Copy |
| Strategia | **Stratega** | Tiene aggiornato l'avanzamento verso l'obiettivo dei 30 matrimoni 2027 |
| AI Reel Maker | **Regista** | Trasforma un video grezzo caricato dalla pagina "Crea Reel AI" in un Reel verticale montato e verificato (vedi sezione dedicata sotto) |

Tutto gira **automaticamente** tramite GitHub Actions (gratuito), scrive i risultati in file dati (`data/*.json`) versionati su git, e la **dashboard** (`dashboard/`, deployabile gratis su Vercel) li legge in tempo reale per farteli controllare da telefono o computer, ovunque tu sia.

### Crescita follower: cosa fa il sistema (e cosa non farà mai)

Nessuna automazione garantisce una crescita "esponenziale" senza rischi: le tattiche che lo farebbero (follow/unfollow di massa, commenti spam su profili altrui, follower comprati) violano i Termini di Servizio di Meta e rischiano la sospensione dell'account, quindi non sono mai state implementate. Le leve usate sono tutte lecite e già attive: preferenza per i Reel (più portata organica), risposte pubbliche rapide ai commenti (Portavoce), CTA "seguimi"/"salva" più forti nelle didascalie, hashtag e pilastri editoriali scelti in base a cosa ha già funzionato davvero (non a rotazione fissa). L'unica leva che dà davvero un salto di scala resta la pubblicità a pagamento (Meta Ads), che richiede un budget reale e non è automatizzata qui.

### Perché il contatto con potenziali sposi è "solo bozze"

Meta vieta l'invio massivo di messaggi non richiesti a sconosciuti (rischio concreto di **ban dell'account**), e la normativa italiana/GDPR limita il contatto commerciale a freddo verso privati. Per questo l'Agente Cacciatore **prepara solo proposte di messaggio** per chi ti ha già scritto un commento con segnali di interesse — la revisione e l'invio restano sempre manuali, da te, nella sezione "Lead" della dashboard.

## Setup — cosa devi fare tu (nessun passaggio può essere fatto da un'automazione: richiedono il tuo login personale)

### 1. Compila i dati del tuo brand

Apri `config/brand.json` e sostituisci tutti i valori "MODIFICA" con i tuoi dati reali (bio, prezzi se vuoi, punti di forza, testimonianze, contatti, tono di voce). Più è dettagliato, migliori saranno i testi generati.

### 2. Crea l'app Meta (Facebook + Instagram Graph API)

Necessario per far pubblicare gli agenti sulle tue pagine.

1. Vai su **[developers.facebook.com](https://developers.facebook.com)** → **Le mie app** → **Crea app** → tipo "Business".
2. Nell'app, aggiungi il prodotto **"Instagram Graph API"** e **"Facebook Login for Business"**.
3. Assicurati che il tuo profilo Instagram sia convertito in **account Business o Creator** e collegato alla tua **Pagina Facebook** (da Meta Business Suite → Impostazioni).
4. Usa lo **Strumento Grafico Explorer** (developers.facebook.com/tools/explorer) per generare un token utente con i permessi: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `read_insights`.
5. Scambia il token utente per un **long-lived Page Access Token** (dura ~60 giorni, va rinnovato periodicamente — la guida ufficiale Meta spiega il comando `oauth/access_token` da usare con `grant_type=fb_exchange_token`).
6. Recupera: `META_PAGE_ID` (id della tua Pagina Facebook) e `META_IG_BUSINESS_ACCOUNT_ID` (id account Instagram Business, ottenibile con una chiamata a `/{page-id}?fields=instagram_business_account`).

> Se questi passaggi ti sembrano complessi, fammi sapere in che punto ti blocchi: posso guidarti chiamata per chiamata, ma il login su Meta e la conferma via 2FA li devi fare tu.

### 3. I media si caricano dalla dashboard (non da Google Photos)

Google ha limitato a marzo 2025 la possibilità per le app di leggere automaticamente un album esistente della libreria Google Photos ([dettagli](https://developers.google.com/photos/support/updates)), quindi il sistema non usa più questa via. Al suo posto, la pagina **"Carica media"** della dashboard ti permette di caricare foto/video direttamente dal telefono: il file va su **Cloudflare R2** (storage gratuito, il caricamento avviene direttamente dal browser tramite un URL temporaneo, senza passare dai server Vercel) e l'Agente Media pesca da lì, uno alla volta, nei giorni successivi.

Vedi la sezione **"Storage media (Cloudflare R2)"** qui sotto per creare bucket e credenziali.

### 3bis. Storage media (Cloudflare R2)

Tutti i media (foto, video grezzi, Reel generati) vivono in un bucket **Cloudflare R2**: piano gratuito con 10GB di storage e — soprattutto per i video — **traffico in uscita sempre gratuito**, nessun limite pratico di dimensione file (a differenza di altri storage gratuiti che bloccano intorno ai 100MB).

1. Crea un account gratuito su **[dash.cloudflare.com](https://dash.cloudflare.com)** (nessuna carta richiesta per il piano free di R2).
2. Nel menu laterale vai su **R2 Object Storage** → **Create bucket**. Dai un nome (es. `gestione-social-dj-media`), location automatica, e crealo.
3. Apri il bucket appena creato → **Settings** → sezione **Public access** → attiva **"Allow Access"** sul dominio `r2.dev` (o collega un tuo dominio, se ne hai uno su Cloudflare). Copia l'URL pubblico che ti mostra (tipo `https://pub-xxxxxxxxxxxx.r2.dev`): è il tuo `R2_PUBLIC_BASE_URL`.
4. Torna alla pagina principale di **R2** → **Manage R2 API Tokens** → **Create API Token**. Permessi: **Object Read & Write**, limitato al bucket appena creato. Alla fine ti mostra tre valori: **Access Key ID**, **Secret Access Key** e l'**Account ID** (visibile anche nell'URL del cruscotto Cloudflare, o nella pagina principale di R2 sulla destra).
5. Questi 5 valori (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`) sono **tutti segreti** tranne l'URL pubblico: vanno inseriti sia nei **GitHub Secrets** (per l'Agente Regista) sia nelle **variabili d'ambiente di Vercel** (per la dashboard) — mai incollati in chat.

### 3ter. Rinnovo del token Meta dalla dashboard

Il **Page Access Token** del punto 2 dura ~60 giorni. La pagina **"Utilizzo servizi"** della dashboard mostra quanti giorni mancano alla scadenza (e un avviso quando è vicina) con un tasto **"🔄 Rinnova token ora"**: ti porta al login Facebook, e una volta confermato salva da solo il nuovo token nel secret GitHub `META_PAGE_ACCESS_TOKEN` — niente più Strumento Grafico Explorer a mano.

Per farlo funzionare servono due cose in più, oltre ai secrets GitHub del punto 2:

1. Sulla dashboard (Vercel), aggiungi **di nuovo** `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN` come variabili d'ambiente (sono due runtime separati — GitHub Actions e Vercel non si scambiano da soli le variabili, anche se il nome è identico). Il `GITHUB_TOKEN` già configurato al punto 5 deve avere anche permesso di scrittura sui secrets del repository (`Secrets: write` se è un fine-grained PAT), altrimenti il tasto genera comunque il token ma te lo mostra da incollare a mano.
2. Nell'app Meta, in **Prodotti → Facebook Login → Impostazioni**, aggiungi ai **"Valid OAuth Redirect URIs"**: `https://tuo-progetto.vercel.app/api/meta-token/callback` (con il dominio vero della tua dashboard).

Se salti questi due passaggi la dashboard funziona lo stesso, semplicemente quella card non compare/il tasto non funziona.

**Automazione completa (opzionale):** senza altro, dopo un rinnovo devi comunque incollare tu il nuovo token anche su Vercel in `META_PAGE_ACCESS_TOKEN` e rifare un Redeploy, perché la card legga quello giusto. Per evitare anche questo, aggiungi su Vercel:

- `VERCEL_TOKEN`: un Personal Access Token creato su **vercel.com → Account Settings → Tokens → Create Token**.
- `VERCEL_PROJECT_ID`: da **Project Settings → General → Project ID**.
- `VERCEL_TEAM_ID`: da **Team Settings → General → Team ID**, solo se il progetto è sotto un account con più progetti/team (su un account personale singolo puoi lasciarlo vuoto).

Con queste impostate, "Rinnova token ora" salva il nuovo token sia su GitHub sia su Vercel e riavvia da solo un deployment: non devi incollare nulla a mano.

### 4. Configura i secrets su GitHub

Nel repository, vai su **Settings → Secrets and variables → Actions** e aggiungi tutti i valori elencati in `.env.example` (META_*, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL` — stessi valori del punto 3bis — e opzionalmente `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_CHAT_ID`).

### 5. Metti online la dashboard (gratis, su Vercel)

1. Vai su **[vercel.com](https://vercel.com)**, collega il tuo account GitHub.
2. Importa questo repository, impostando come **Root Directory**: `dashboard`, e come **Framework Preset**: `Next.js`.
3. Crea un **GitHub Personal Access Token** (Settings del tuo account GitHub → Developer settings → Personal access tokens → Fine-grained) con permessi **Contents: Read and write** e **Actions: Read and write**, limitato a questo repository — il primo serve alla dashboard per leggere i dati e salvare i nuovi media caricati, il secondo per far scrivere subito la didascalia quando premi "Usa per un post" nella pagina "Crea Reel AI" (altrimenti aspetta comunque il ciclo automatico del giorno dopo).
4. Aggiungi le variabili d'ambiente (da `dashboard/.env.example`): `DASHBOARD_PASSWORD`, `SESSION_SECRET`, `GITHUB_REPO` (es. `greenkeepe/Gestione-Social-DJ`), `GITHUB_BRANCH` (es. `main`), `GITHUB_TOKEN` (il token appena creato), e i 5 valori R2 dal passo 3bis (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`). Se vuoi anche l'invio da Telegram, aggiungi `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` (vedi sezione **"Invio da Telegram"** più sotto).
5. Deploy. La dashboard sarà raggiungibile da un link tipo `https://tuo-progetto.vercel.app`, protetto da password, da qualsiasi dispositivo.
**Importante — evita di esaurire il limite giornaliero di build gratuite:** gli agenti scrivono spesso su `data/*.json` (ogni 20 minuti, per il Regista), ma la dashboard legge quei dati dal vivo tramite l'API di GitHub, senza bisogno di una build ad ogni commit. Su Vercel vai su **Settings → Build and Deployment → Ignored Build Step**, imposta "Behavior" su **Custom** e incolla: `git diff --quiet HEAD^ HEAD -- dashboard`. Così Vercel costruisce una build vera solo quando cambia il codice della dashboard, non ad ogni commit automatico di dati — senza questo, il piano gratuito può bloccarsi per 24 ore con l'errore "Deployment rate limited".

### 6. Attiva le automazioni

Le tre GitHub Actions (`.github/workflows/daily-agents.yml`, `publish-check.yml` e `reel-maker.yml`) partono da sole secondo lo schedule una volta che i secrets sono impostati. Puoi anche lanciarle manualmente da **Actions → [nome workflow] → Run workflow** per un primo test.

**Ciclo giornaliero: orario preciso via Vercel Cron.** `daily-agents.yml` non ha più un trigger `schedule` proprio — lo "schedule" di GitHub Actions può arrivare con ore di ritardo sui repository con poca attività continua (osservato dal vivo: 4-5 ore). Il file `dashboard/vercel.json` definisce invece un Cron Job di Vercel (gratis anche sul piano Hobby, fino a 2 cron/giorno) che ogni mattina alle 08:00 Europe/Rome chiama `dashboard/app/api/cron/daily-agents`, che a sua volta innesca il ciclo su GitHub con precisione. Serve solo aggiungere `CRON_SECRET` (una stringa a caso) tra le variabili d'ambiente di Vercel — vedi `dashboard/.env.example`.

## AI Reel Maker (video grezzo → Reel)

Dalla pagina **"🎬 Crea Reel AI"** della dashboard carichi un video grezzo (stesso upload diretto a Cloudflare R2 già usato per "Carica media" — nessun limite pratico di dimensione) scegliendo un profilo di montaggio — **Automatico**, DJ/Party, Matrimonio, Evento, Aziendale, Persona che parla in camera, Promozionale — ed eventuali note libere ("è il momento del primo ballo", ecc.).

Il Regista (`agents/reel-maker-agent.ts`, eseguito da `.github/workflows/reel-maker.yml` ogni ~20 minuti) lo elabora con **ffmpeg** (installato gratis sul runner GitHub Actions), senza servizi cloud di editing a pagamento:

1. **Analisi**: durata, risoluzione, fps, audio (`ffprobe`).
2. **Rilevazione scene** reale (filtro `scene` di ffmpeg) e, se c'è audio, **rilevazione silenzi** e **misura del volume** di ogni spezzone candidato (`lib/videoTools.ts`) — punteggi calcolati sui dati veri del video, mai inventati.
3. **Piano di montaggio** (`lib/reelPlanner.ts`): sceglie l'hook (mai i primissimi istanti del video) e i segmenti migliori in base al punteggio, con stile Clean/Dynamic/Bold dedotto dal profilo (in **Automatico**, dedotto dall'energia audio e dalla frequenza dei cambi scena).
4. **Montaggio**: ritaglio 9:16 centrato, concatenazione (hard-cut o dissolvenza a seconda dello stile), normalizzazione audio (`loudnorm`), testo di apertura opzionale.
5. **Controllo qualità**: verifica reale (risoluzione 1080×1920, presenza audio, durata coerente) prima di segnare il job come pronto — se qualcosa non torna il job va in **errore** invece di essere spacciato per riuscito.
6. Il Reel finito viene caricato su Cloudflare R2 e appare nella pagina "Crea Reel AI" con l'anteprima. Da lì puoi **Rigenerare** o **Usare per un post**: in quel momento (e solo allora, per tua scelta) entra in `data/media-library.json` come un media normale, e lo gestiscono gli agenti già esistenti — Occhio lo mette in coda, Copy scrive la didascalia, Editore lo pubblica nell'orario migliore. Nessuna pubblicazione automatica "a sorpresa" per i video caricati **dalla dashboard**.

I video ricevuti **da Telegram** (vedi sotto) sono un'eccezione voluta: appena il Reel è pronto entra da solo nella libreria media, senza passare dal click "Usa per un post" — è tutto il senso di mandare un video dal telefono e non doverci più pensare.

**Limiti noti (per restare a costo zero)**:
- Il ritaglio 9:16 è **centrato**, non segue il soggetto: un vero tracking richiederebbe un modello di visione artificiale (GPU, servizio a pagamento).
- **Niente sottotitoli automatici**: non è integrato nessun servizio di trascrizione (a pagamento). Restano disattivati finché non ne colleghi uno.
- **Niente musica di sottofondo automatica**: nessuna libreria musicale con diritti verificati è integrata — il Reel usa solo l'audio originale del video, normalizzato.
- Puoi disattivare la funzione senza toccare il codice impostando `ENABLE_AI_REEL_MAKER=false`.

## Invio da Telegram (il modo più semplice di usare il sistema)

Invece di aprire la dashboard per caricare foto/video, puoi mandarli direttamente a un bot Telegram personale: il resto (didascalia, montaggio del Reel, orario migliore, pubblicazione) lo fanno gli agenti da soli. Il bot risponde in chat per confermare cosa sta succedendo, così hai sempre visibilità senza dover controllare nulla.

**Come funziona:**
- Mandi una **foto** → entra in `data/media-library.json` come un upload dashboard: Copy le scrive la didascalia (guardandola davvero, se hai `ANTHROPIC_API_KEY`) ed Editore la pubblica nell'orario migliore.
- Mandi un **video** → entra nella coda dell'AI Reel Maker (`data/reel-jobs.json`): il Regista lo monta in un Reel verticale e, a differenza dei video caricati dalla dashboard, lo pubblica **in automatico** appena pronto, senza bisogno di premere "Usa per un post".
- Se aggiungi una **didascalia al messaggio Telegram** (es. "è il primo ballo di Marco e Giulia"), quella nota arriva a Copy/Regista come contesto per scrivere un testo più pertinente — senza inventare fatti che non gli hai detto.

**Setup (una tantum):**
1. Apri una chat con **[@BotFather](https://t.me/BotFather)** su Telegram, manda `/newbot` e segui le istruzioni: alla fine ti dà un **token** (`TELEGRAM_BOT_TOKEN`).
2. Trova il tuo **chat id**: manda un qualsiasi messaggio al tuo nuovo bot, poi apri nel browser `https://api.telegram.org/bot<TOKEN>/getUpdates` (sostituendo `<TOKEN>`) e cerca `"chat":{"id":...}` nella risposta. Quel numero è `TELEGRAM_ALLOWED_CHAT_ID` — **solo i messaggi da questo id vengono accettati**, chiunque altro scriva al bot viene ignorato.
3. Scegli una stringa segreta a caso per `TELEGRAM_WEBHOOK_SECRET` (es. generata con `openssl rand -hex 24`).
4. Aggiungi le 3 variabili (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`) nelle variabili d'ambiente di **Vercel** (dashboard) e le prime due anche nei **GitHub Secrets** (servono agli agenti Editore/Regista per le notifiche di conferma — passo facoltativo, il resto funziona comunque senza).
5. Registra il webhook (una volta sola, dopo il deploy) aprendo nel browser:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://tuo-progetto.vercel.app/api/telegram-webhook&secret_token=<TUO_TELEGRAM_WEBHOOK_SECRET>`
6. Fatto: manda una foto al bot e in pochi secondi dovresti ricevere una risposta di conferma.

**Limite noto**: la Bot API di Telegram permette di **scaricare** al massimo file da **20MB**, anche se in chat puoi inviarne di più grandi (limite della piattaforma Telegram, non di questo progetto — servirebbe un Bot API server self-hosted per aggirarlo, fuori scope per un sistema a costo zero). Per video più pesanti, comprimili prima di inviarli oppure carica il file direttamente dalla pagina "Crea Reel AI" della dashboard, che non ha questo limite.

## Contatti locali (email) — pagina "Locali"

L'Agente Esploratore, avviato **a comando** dal tasto "🔍 Cerca nuovi locali" nella pagina "Locali" (non gira più da solo ogni giorno — vedi `.github/workflows/outreach-search.yml`), trova fino a 10 ristoranti/hotel con un'email pubblica sul sito e prepara una bozza di email di collaborazione, firmata con i tuoi contatti veri (telefono, email, Instagram, Facebook, sito — da `config/brand.json > contatti`, mai inventati). Usa **OpenStreetMap** (gratuito, nessuna chiave API). La ricerca gira su GitHub Actions e richiede qualche minuto: i nuovi contatti compaiono in "Da rivedere" quando finisce. **Nessun invio automatico**: le bozze restano in attesa nella pagina "Locali" della dashboard finché non premi tu "Invia" — un contatto alla volta, mai un invio di massa, per non far passare la tua casella vera per spam e restare sempre sotto revisione umana. La stessa email non viene mai riproposta due volte (deduplica sia per locale sia per indirizzo email, per non ricontattare due volte una catena con un unico indirizzo condiviso).

**Dove cerca**: dalla pagina "Locali" puoi scegliere in una tendina una o più province (Piemonte/Liguria/Lombardia) — se non ne scegli nessuna, l'Esploratore cerca nel raggio intorno alla tua sede (`config/brand.json > areaServita`, limitato a 60km per non appesantire troppo la ricerca su OpenStreetMap).

**Limite onesto**: OpenStreetMap non segna in modo affidabile quali locali "fanno eventi/matrimoni" — l'Esploratore filtra solo per categoria (ristorante/hotel) e presenza di un sito web, non per rilevanza. Guarda sempre la bozza prima di inviarla. Allo stesso modo non ha quasi mai il nome di chi gestisce il locale: le email si rivolgono sempre al locale in generale, mai a una persona inventata.

**Setup (una tantum) per l'invio con un tap:**
1. Attiva la **verifica in due passaggi** sul tuo account Google, se non ce l'hai già (myaccount.google.com → Sicurezza).
2. Sempre in Sicurezza, cerca **"Password per le app"**, creane una nuova (nome a piacere, es. "Gestione Social DJ") e copia la stringa di 16 caratteri che ti mostra — **non è la tua password normale**, è una chiave dedicata solo a questo, revocabile in qualsiasi momento senza toccare l'account.
3. Aggiungi su **Vercel** (variabili d'ambiente della dashboard) `GMAIL_ADDRESS` (la tua casella Gmail, es. `info.andreaforte@gmail.com`) e `GMAIL_APP_PASSWORD` (la stringa del passo 2).

Senza questa configurazione, l'Esploratore continua comunque a preparare le bozze (le vedi lo stesso nella dashboard), semplicemente il tasto "Invia" darà errore finché non è impostata.

## Provare il sistema in locale (facoltativo, per sviluppatori)

```bash
npm install                 # dipendenze agenti
cp .env.example .env        # e compila con le tue credenziali
npm run master              # esegue un ciclo completo degli agenti
npm run agent:reelmaker     # elabora un video grezzo in coda (richiede ffmpeg installato)

cd dashboard
npm install
cp .env.example .env.local  # compila DASHBOARD_PASSWORD e SESSION_SECRET
npm run dev                 # dashboard su http://localhost:3000
```

## Costo attuale e upgrade futuri

Oggi tutto gira a **costo zero**:
- GitHub Actions: gratuito su repository pubblici (o incluso nel piano free su privati, entro i minuti mensili)
- Vercel: piano free per la dashboard, nessuna carta di credito richiesta
- Cloudflare R2: piano free con 10GB di storage e traffico in uscita sempre gratuito, nessuna carta richiesta — ampiamente sufficiente per uso personale
- Meta Graph API: gratuita entro i limiti standard
- Generazione testi: template scritti a mano, zero costo
- AI Reel Maker: ffmpeg (open source, gratuito) sul runner GitHub Actions — nessun servizio di editing/transcrizione a pagamento

**Quando vorrai investire** (vedi anche `docs/strategia-marketing-2027.md`):
- **Sponsorizzazioni Meta Ads**: budget mirato geograficamente per accelerare la fase di crescita lead, quando il canale organico non basta più a sostenere il ritmo verso i 30 matrimoni.
- **`ANTHROPIC_API_KEY`**: se impostata, il Content Agent **guarda davvero la foto (o un fotogramma del video/reel)** e scrive una didascalia pertinente a quello che è raffigurato, invece di un template fisso — e il Leads Agent scrive messaggi più naturali. Senza la chiave, tutto funziona comunque: il Content Agent usa più varianti scritte a mano per ogni tema, così due post con lo stesso tema non escono mai identici. Costo minimo a consumo, qualche centesimo al giorno.
- Strumenti di scheduling/analytics più avanzati, se il volume di contenuti crescerà oltre quanto gestibile dal sistema attuale.

### Didascalie con visione + call to action WhatsApp

Il Content Agent (Copy) fa sempre due cose, con o senza `ANTHROPIC_API_KEY`:

1. **Guarda il contenuto**: se la chiave è impostata, invia l'immagine (o un fotogramma estratto dal video con ffmpeg) a Claude insieme al tema del giorno, e la didascalia che ne esce descrive davvero quello che si vede — non un testo generico. Senza chiave, sceglie a caso tra più varianti scritte a mano per lo stesso tema, così i post non si ripetono mai identici.
2. **Chiude sempre con una call to action verso WhatsApp**: usa il numero reale da `config/brand.json` (`contatti.whatsapp`) per generare un link `https://wa.me/...`, aggiunto in fondo a ogni didascalia — l'obiettivo non è solo il like, ma spingere chi guarda a scriverti per informazioni.

## Struttura del repository

```
agents/       agenti (Master + 6 specializzati), eseguiti da GitHub Actions
lib/          librerie condivise (storage, Meta Graph API, ffmpeg/reel planner, ecc.)
config/       config/brand.json — i tuoi dati reali
data/         "database" a costo zero: file JSON aggiornati dagli agenti
dashboard/    app Next.js, deployabile gratis su Vercel
docs/         piano marketing dettagliato verso i 30 matrimoni 2027
.github/workflows/  automazioni giornaliere (GitHub Actions)
```

## Limiti noti / cose da tenere a mente

- Il **Page Access Token** Meta scade periodicamente (~60 giorni, o prima se generato senza estenderlo esplicitamente su Graph API Explorer): se le pubblicazioni iniziano a fallire, è la prima cosa da controllare e rigenerare.
- La ricerca lead si basa solo su **commenti su contenuti già pubblicati** (nessuna ricerca di sconosciuti), per restare nei limiti consentiti da Meta e dalla normativa privacy.
- Il piano gratuito di Cloudflare R2 (10GB di storage) è pensato per uso personale: se il volume di foto/video crescerà molto, valuta un piano a pagamento (comunque economico: $0.015/GB/mese oltre i 10GB inclusi).
- Il link Musiqua fornito non era raggiungibile dall'ambiente di sviluppo in fase di creazione del sistema: se vuoi che i testi riflettano esattamente i contenuti di quel profilo, incolla qui le informazioni principali (bio, prezzi, recensioni) e le integro in `config/brand.json`.
- La Bot API di Telegram non scarica file oltre i **20MB** (vedi sezione "Invio da Telegram"): per video più pesanti usa la pagina "Crea Reel AI" della dashboard.
- I video ricevuti da Telegram vengono pubblicati **senza revisione manuale** una volta montati (a differenza di quelli caricati dalla dashboard, che restano in attesa del click "Usa per un post"): è una scelta voluta per semplificare l'uso da telefono, ma significa fidarsi del montaggio automatico dell'AI Reel Maker.
