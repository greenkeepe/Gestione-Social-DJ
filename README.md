# Gestione Social DJ — sistema multi-agente per Facebook & Instagram

Sistema di agenti autonomi che gestiscono la presenza social del tuo profilo DJ (matrimoni, eventi, party): pubblicano contenuti presi dal tuo Google Photos, individuano potenziali sposi interessati, tengono aggiornata una strategia verso l'obiettivo di **30 matrimoni nel 2027**, e tutto è controllabile da una dashboard raggiungibile da remoto. Costo attuale: **zero** (GitHub Actions + Vercel free tier).

## Come è fatto il sistema

Un **Agente Master ("Direttore")** coordina ogni giorno 5 agenti specializzati, ciascuno con un ruolo preciso:

| Agente | Nome | Cosa fa |
|---|---|---|
| Media | **Occhio** | Sceglie la prossima foto/video dall'album Google Photos dedicato, evitando ripetizioni |
| Contenuti | **Copy** | Scrive didascalia e hashtag seguendo il calendario editoriale e il tono di voce del brand |
| Pubblicazione | **Editore** | Pubblica su Instagram e Facebook nell'orario storicamente più efficace della giornata |
| Lead | **Cacciatore** | Individua chi ha commentato/interagito con interesse e prepara bozze di messaggi — **non invia mai nulla da solo** |
| Analytics | **Analista** | Legge le statistiche da Meta e aggiorna i KPI |
| Strategia | **Stratega** | Tiene aggiornato l'avanzamento verso l'obiettivo dei 30 matrimoni 2027 |

Tutto gira **automaticamente ogni giorno** tramite GitHub Actions (gratuito), scrive i risultati in file dati (`data/*.json`) versionati su git, e la **dashboard** (`dashboard/`, deployabile gratis su Vercel) li legge in tempo reale per farteli controllare da telefono o computer, ovunque tu sia.

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

### 3. Crea l'accesso a Google Photos

1. Crea un progetto su **[console.cloud.google.com](https://console.cloud.google.com)** (gratuito).
2. Abilita la **Photos Library API**.
3. Crea credenziali OAuth **"App desktop"**, salva `Client ID` e `Client Secret`.
4. Ottieni un `refresh_token` seguendo il flusso OAuth una tantum (posso prepararti uno script guidato se serve).
5. Crea su Google Photos (dal telefono) un **album dedicato** (es. "DJ Social") dove carichi le foto/video da usare, e prendine l'ID album.

### 4. Configura i secrets su GitHub

Nel repository, vai su **Settings → Secrets and variables → Actions** e aggiungi tutti i valori elencati in `.env.example` (META_*, GOOGLE_*, e opzionalmente `ANTHROPIC_API_KEY`).

### 5. Metti online la dashboard (gratis, su Vercel)

1. Vai su **[vercel.com](https://vercel.com)**, collega il tuo account GitHub.
2. Importa questo repository, impostando come **Root Directory**: `dashboard`.
3. Aggiungi le variabili d'ambiente (da `dashboard/.env.example`): `DASHBOARD_PASSWORD`, `SESSION_SECRET`, `GITHUB_REPO` (es. `greenkeepe/gestione-social-dj`), `GITHUB_BRANCH` (es. `main`), ed eventualmente `GITHUB_TOKEN` se il repo è privato (un Personal Access Token con permesso `contents: read`).
4. Deploy. La dashboard sarà raggiungibile da un link tipo `https://tuo-progetto.vercel.app`, protetto da password, da qualsiasi dispositivo.

### 6. Attiva le automazioni

Le due GitHub Actions (`.github/workflows/daily-agents.yml` e `publish-check.yml`) partono da sole secondo lo schedule una volta che i secrets sono impostati. Puoi anche lanciarle manualmente da **Actions → [nome workflow] → Run workflow** per un primo test.

## Provare il sistema in locale (facoltativo, per sviluppatori)

```bash
npm install                 # dipendenze agenti
cp .env.example .env        # e compila con le tue credenziali
npm run master              # esegue un ciclo completo degli agenti

cd dashboard
npm install
cp .env.example .env.local  # compila DASHBOARD_PASSWORD e SESSION_SECRET
npm run dev                 # dashboard su http://localhost:3000
```

## Costo attuale e upgrade futuri

Oggi tutto gira a **costo zero**:
- GitHub Actions: gratuito su repository pubblici (o incluso nel piano free su privati, entro i minuti mensili)
- Vercel: piano free per la dashboard
- Meta Graph API, Google Photos API: gratuite entro i limiti standard
- Generazione testi: template scritti a mano, zero costo

**Quando vorrai investire** (vedi anche `docs/strategia-marketing-2027.md`):
- **Sponsorizzazioni Meta Ads**: budget mirato geograficamente per accelerare la fase di crescita lead, quando il canale organico non basta più a sostenere il ritmo verso i 30 matrimoni.
- **`ANTHROPIC_API_KEY`**: se impostata, il Content Agent e il Leads Agent generano testi più naturali e variati tramite Claude invece dei template (costo minimo a consumo, qualche centesimo al giorno).
- Strumenti di scheduling/analytics più avanzati, se il volume di contenuti crescerà oltre quanto gestibile dal sistema attuale.

## Struttura del repository

```
agents/       agenti (Master + 6 specializzati), eseguiti da GitHub Actions
lib/          librerie condivise (storage, Meta Graph API, Google Photos, ecc.)
config/       config/brand.json — i tuoi dati reali
data/         "database" a costo zero: file JSON aggiornati dagli agenti
dashboard/    app Next.js, deployabile gratis su Vercel
docs/         piano marketing dettagliato verso i 30 matrimoni 2027
.github/workflows/  automazioni giornaliere (GitHub Actions)
```

## Limiti noti / cose da tenere a mente

- Il **Page Access Token** Meta scade periodicamente (~60 giorni): se le pubblicazioni iniziano a fallire, è la prima cosa da controllare e rigenerare.
- La ricerca lead si basa solo su **commenti su contenuti già pubblicati** (nessuna ricerca di sconosciuti), per restare nei limiti consentiti da Meta e dalla normativa privacy.
- Il link Musiqua fornito non era raggiungibile dall'ambiente di sviluppo in fase di creazione del sistema: se vuoi che i testi riflettano esattamente i contenuti di quel profilo, incolla qui le informazioni principali (bio, prezzi, recensioni) e le integro in `config/brand.json`.
