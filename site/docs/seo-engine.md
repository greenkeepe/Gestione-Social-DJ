# SEO Engine (MVP) — architettura, setup, troubleshooting

Sistema interno "a costo zero" per raccogliere dati reali da Google Search
Console, segnalare opportunità SEO e controllare l'internal linking, senza
toccare in nessun modo la grafica pubblica del sito. Nessun database, nessun
servizio SaaS a pagamento, nessuna AI: solo script Node/TypeScript e file
JSON versionati su git, sullo stesso pattern già usato dal resto del
repository per l'automazione social (`lib/storage.ts`).

## Come funziona (flusso)

```
Google Search Console
  → GitHub Actions (settimanale, .github/workflows/seo-gsc.yml)
    → scripts/seo/sync-gsc.ts        → data/seo/gsc-data.json
    → scripts/seo/check-indexing.ts  → data/seo/indexing.json
    → scripts/seo/detect-opportunities.ts → data/seo/opportunities.json
    → scripts/seo/propose-fixes.ts   → data/seo/seo-proposte.json (con Claude, se ANTHROPIC_API_KEY è impostata)
    → scripts/seo/check-internal-links.ts → data/seo/internal-links.json
  → commit automatico dei JSON aggiornati, notifica Telegram se ci sono nuove proposte
    → Netlify rileva il nuovo commit e rifà il build del sito
      → /admin/seo (protetta da Basic Auth) legge quei JSON e li mostra, in sola lettura
      → dashboard privata (Vercel, progetto separato) → pagina "SEO": qui le
        proposte si rivedono, si correggono se serve, e si applicano o si
        scartano — vedi "Come si rivede/applica una proposta" più sotto
```

Nessuno step della sincronizzazione settimanale modifica contenuti pubblici
o crea pagine: produce solo segnalazioni e proposte da valutare
manualmente. L'unica scrittura reale sul sito (`messages/it.json`) avviene
quando **una persona** preme "Applica" nella dashboard, mai da sola.

## File creati

- `site/data/routes.ts` — lista unica delle pagine (usata da sitemap e dal
  controllo internal linking, per non avere due liste che disallineano).
- `site/lib/seoEngineTypes.ts` — tipi condivisi tra script e dashboard.
- `site/scripts/seo/lib/gsc-client.ts` — autenticazione Service Account e
  chiamata alla Search Analytics API e alla URL Inspection API (stesso
  Service Account e stesso scope readonly, nessun permesso aggiuntivo).
- `site/scripts/seo/lib/local-areas.ts` — elenco di comuni reali entro
  ~150km, usato solo per etichettare un'opportunità come "locale".
- `site/scripts/seo/sync-gsc.ts`, `check-indexing.ts`,
  `detect-opportunities.ts`, `propose-fixes.ts`, `check-internal-links.ts`,
  `run-all.ts` — pipeline. `check-indexing.ts` interroga l'URL Inspection
  API per ogni combinazione pagina×lingua (`data/routes.ts` ×
  `i18n/routing.ts`, stessa lista usata da `app/sitemap.ts`) e riporta lo
  stato reale di indicizzazione (indicizzata/non indicizzata/mai
  scansionata/errore). `propose-fixes.ts` chiede a Claude un titolo/meta
  description alternativi per ogni pagina con un'opportunità nuova (una
  proposta attiva per pagina alla volta), usando `data/routes.ts` per sapere
  quale chiave di `messages/it.json` corrisponde a quella pagina — senza
  `ANTHROPIC_API_KEY` non genera nulla, il resto della pipeline continua.
- `site/data/routes.ts` — oltre a path/label di ogni pagina, ora anche
  `metaNamespace`/`metaTitleKey`/`metaDescriptionKey`: dove si trova in
  `messages/it.json` il titolo/meta description di quella pagina (usato da
  `propose-fixes.ts` e dalla dashboard per applicare una proposta).
- `site/data/seo/*.json` — dati generati (placeholder finché non gira la
  prima sincronizzazione). `seo-proposte.json` è l'unico scritto anche fuori
  dal workflow settimanale (dalla dashboard, quando applichi/scarti).
- `site/proxy.ts` — Basic Auth per `/admin/*` (Next.js 16 ha rinominato
  `middleware.js` in `proxy.js`: stessa funzione, nome nuovo).
- `site/app/admin/seo/page.tsx` — dashboard di sola lettura (dati grezzi
  Search Console + opportunità + internal linking). Le proposte di
  titolo/meta si rivedono invece nella dashboard privata separata (progetto
  `dashboard/`, pagina "SEO"), l'unica con le credenziali per scrivere sul
  repository.
- `dashboard/app/(dashboard)/seo/page.tsx`,
  `dashboard/components/SeoProposalCard.tsx`,
  `dashboard/app/api/seo/[id]/applica/route.ts`,
  `dashboard/app/api/seo/[id]/scarta/route.ts` — revisione e applicazione
  delle proposte (progetto `dashboard/`, non `site/`).
- `.github/workflows/seo-gsc.yml` — esecuzione settimanale + commit dei dati.

## File modificati

- `site/app/sitemap.ts` — ora legge `data/routes.ts` invece di una lista
  duplicata.
- `site/app/robots.ts` — aggiunto `disallow: /admin` (in aggiunta al Basic
  Auth e al `noindex` della pagina stessa: tre livelli di protezione).
- `site/package.json` — aggiunti gli script `seo:*` e le dipendenze
  `google-auth-library` (client Google ufficiale) e `tsx` (per eseguire gli
  script TypeScript in CI).
- `site/.env.example` — documentate `ADMIN_SEO_USER` / `ADMIN_SEO_PASSWORD`.

## Configurazione necessaria

### 1. Variabili sull'host del sito (Environment Variables del progetto `site`, attualmente Netlify)

| Nome | Valore | Note |
| --- | --- | --- |
| `ADMIN_SEO_USER` | a scelta, es. `andrea` | privata, non `NEXT_PUBLIC_` |
| `ADMIN_SEO_PASSWORD` | una password a scelta, non banale | privata |

Senza queste due, `/admin/seo` risponde sempre "non configurata" (blocco
esplicito, non un errore silenzioso).

Per rivedere e applicare le **proposte** di titolo/meta non serve nessuna
variabile aggiuntiva: la pagina "SEO" della dashboard privata (progetto
`dashboard/`, Vercel) riusa lo stesso `GITHUB_TOKEN`/`GITHUB_REPO` già
configurati lì per tutte le altre scritture sul repository (media, email,
coda contenuti). `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN` e
`TELEGRAM_ALLOWED_CHAT_ID` per `propose-fixes.ts` sono gli stessi GitHub
Secrets già usati dal resto del repository — nessun secret nuovo da creare.

### 2. Google Cloud Console + Search Console (per i GitHub Secrets)

Questa parte va fatta da Andrea manualmente: nessuna credenziale può essere
generata o indovinata da qui.

1. Vai su [Google Cloud Console](https://console.cloud.google.com/) e crea
   (o riusa) un progetto qualsiasi — è gratuito, non serve fatturazione per
   questo uso.
2. **Abilita l'API**: menu → "API e servizi" → "Libreria" → cerca
   **"Google Search Console API"** → Abilita.
3. **Crea un Service Account**: "API e servizi" → "Credenziali" → "Crea
   credenziali" → "Account di servizio". Nome a scelta, es.
   `fortedj-seo-readonly`. Nessun ruolo particolare da assegnare a livello di
   progetto Google Cloud.
4. Apri il Service Account appena creato → scheda "Chiavi" → "Aggiungi
   chiave" → "Crea nuova chiave" → formato **JSON** → scarica il file.
5. **Concedi l'accesso in Search Console** (non in Google Cloud): vai su
   [search.google.com/search-console](https://search.google.com/search-console),
   seleziona la proprietà `fortedj.it` → Impostazioni → "Utenti e
   autorizzazioni" → "Aggiungi utente" → incolla l'indirizzo email del
   Service Account (è nel file JSON scaricato, campo `client_email`, del
   tipo `...@...iam.gserviceaccount.com`) → livello **Restricted** (basta
   per leggere i dati di rendimento).
6. Nel repository GitHub, vai su Settings → Secrets and variables → Actions
   → "New repository secret" e crea:
   - `GSC_SERVICE_ACCOUNT_KEY` — valore: **l'intero contenuto** del file
     JSON scaricato al punto 4 (apri il file, copia tutto, incolla tutto).
   - `GSC_SITE_URL` — valore: l'URL esatto della proprietà così come appare
     nell'elenco proprietà di Search Console (quasi certamente
     `https://www.fortedj.it/`, con lo slash finale — copialo da lì invece
     di scriverlo a mano, per evitare un mismatch).

Nessuna credenziale va mai scritta nel codice o committata: solo GitHub
Secrets (per il workflow) e Vercel Environment Variables (per la dashboard).

## Eseguire manualmente

```bash
cd site
npm install
npm run seo:all              # tutta la pipeline
npm run seo:sync             # solo Search Console (richiede le env GSC_*)
npm run seo:indexing         # solo lo stato di indicizzazione (richiede le env GSC_*)
npm run seo:opportunities    # solo l'analisi (usa l'ultimo gsc-data.json)
npm run seo:propose          # solo le proposte titolo/meta (richiede ANTHROPIC_API_KEY, usa l'ultimo opportunities.json)
npm run seo:internal-links   # solo il controllo dei link interni
```

Il workflow GitHub Actions si può anche lanciare a mano da GitHub → Actions
→ "SEO Engine - sincronizzazione Search Console" → "Run workflow".

## Come si rivede/applica una proposta

1. Quando `propose-fixes.ts` genera una proposta nuova arriva una notifica
   Telegram con pagina, query e priorità.
2. Vai sulla dashboard privata → pagina **"SEO"**: ogni proposta mostra
   titolo/meta attuali affiancati alla versione proposta, già dentro un
   campo modificabile.
3. Tre scelte:
   - **Applica sul sito** così com'è proposto.
   - Correggi il testo nel campo, poi **Applica sul sito** — viene scritto
     esattamente quello che c'è nel campo al momento del click, non la
     proposta originale.
   - **Scarta** — il sito resta invariato, la proposta esce dalla lista "da
     rivedere" e non viene riproposta per la stessa pagina finché non
     emerge un'opportunità diversa.
4. "Applica" scrive davvero in `messages/it.json` (commit + push su questo
   stesso repository) e segna la proposta come "applicata". Il sito
   pubblico riflette il cambiamento al prossimo deploy (Netlify, automatico
   sul push, di solito pochi minuti).
5. Nessuno step del ciclo settimanale applica mai nulla da solo: la scrittura
   reale avviene solo dentro questo procedimento, con un click esplicito.

## Le regole dell'Opportunity Detector (perché una query è segnalata)

Nessun punteggio proprietario: solo soglie leggibili, applicate ai dati
grezzi di Search Console (`site/scripts/seo/detect-opportunities.ts`):

- **Fascia di posizione**: 5–20 (query vicine alla prima pagina, non ancora
  arrivate).
- **Impression minime**: 30 (sotto, il volume è troppo basso per contare).
- **CTR basso**: sotto il 3% in quella fascia di posizione.
- **Priorità**: HIGH se impression ≥ 300, MEDIUM se ≥ 100, LOW altrimenti —
  sempre e solo tra le query che già passano i tre criteri sopra.

Ogni riga della dashboard mostra il motivo testuale con i numeri reali, mai
un'etichetta senza spiegazione. Sono segnalazioni operative, non un giudizio
sulla qualità del sito e non una promessa di risultato.

## Troubleshooting

- **"Variabile d'ambiente mancante: GSC_SERVICE_ACCOUNT_KEY/GSC_SITE_URL"**:
  i secrets non sono ancora configurati su GitHub (vedi sopra). Gli altri
  step della pipeline (opportunità con dati vuoti, internal linking)
  continuano comunque a girare.
- **"Google non ha restituito un access token"**: quasi sempre il Service
  Account non è stato aggiunto come utente nella proprietà Search Console
  (punto 5 sopra), oppure `GSC_SITE_URL` non coincide esattamente con la
  proprietà (protocollo/slash finale diversi).
- **`/admin/seo` risponde 503 "non configurata"**: mancano
  `ADMIN_SEO_USER`/`ADMIN_SEO_PASSWORD` su Vercel.
- **La dashboard mostra sempre dati vuoti dopo il deploy**: controlla che il
  workflow GitHub Actions abbia effettivamente fatto commit su
  `site/data/seo/` (tab Actions del repository) — se non c'è nulla da
  aggiornare (stessi dati) non crea un commit vuoto, è normale.

## Come disattivare il sistema

- Per fermare la raccolta dati: disabilita il workflow da GitHub → Actions →
  "SEO Engine - sincronizzazione Search Console" → "..." → "Disable
  workflow" (i dati esistenti restano visibili in `/admin/seo`).
- Per chiudere completamente la dashboard: rimuovi
  `ADMIN_SEO_USER`/`ADMIN_SEO_PASSWORD` da Vercel — `/admin/seo` risponderà
  sempre 503.
- Nessuna di queste azioni tocca il sito pubblico.
