# Forte DJ — sito pubblico

Sito vetrina di Forte DJ (Next.js 16 App Router + TypeScript + Tailwind CSS v4 +
Framer Motion), pensato per portare i visitatori a **verificare la
disponibilità** per il proprio evento.

È un progetto separato dal resto del repository (che gestisce l'automazione
social e vive nella cartella `dashboard/` e nella root): si sviluppa e si
deploya in modo indipendente, esattamente come `dashboard/`.

## Contenuti reali vs. segnaposto

Tutti i testi, i numeri (20 anni di esperienza, 200+ eventi, contatti,
recensioni) e i servizi elencati sono presi da `config/brand.json` nella root
del repository — nessun dato è stato inventato. Due cose mancano ancora e sono
segnalate chiaramente nel sito invece di essere finte:

- **Foto e video**: non ci sono ancora asset reali in questo repository. La
  Gallery (`data/gallery.ts`) e lo Showreel (`data/media.ts`) mostrano uno
  stato "in arrivo" finché non vengono aggiunti file reali in
  `public/images/` / `public/videos/`.
- **Recensioni testuali**: non vengono riprodotte a mano (richiesta esplicita
  del brief), ma mostrate tramite il widget ufficiale Musiqua nella sezione
  Recensioni.

## Sviluppo

```bash
npm install
cp .env.example .env.local   # opzionale in sviluppo
npm run dev
```

## Variabili d'ambiente

Vedi `.env.example`. In particolare:

- `RESEND_API_KEY` — senza questa chiave il modulo di contatto valida e
  registra la richiesta nei log del server ma **non invia alcuna email**:
  crea un account su [resend.com](https://resend.com), verifica un mittente e
  incolla qui la chiave per attivare l'invio reale. Nel frattempo il
  visitatore ha comunque il bottone WhatsApp e i contatti diretti in pagina.
- `NEXT_PUBLIC_SITE_URL` — dominio pubblico del sito, da valorizzare solo
  quando esiste davvero (usato per canonical URL e sitemap).
- `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_GTM_ID` / `NEXT_PUBLIC_META_PIXEL_ID` —
  opzionali, attivano i rispettivi script solo se valorizzati.

## Popolare la Gallery e lo Showreel

1. Aggiungi le foto in `public/images/gallery/` e aggiungi le voci
   corrispondenti in `data/gallery.ts` (categoria `wedding` | `party` |
   `events`).
2. Aggiungi il video in `public/videos/` e valorizza `data/media.ts`
   (`videoSrc`, `posterSrc`).

## Deploy

Come `dashboard/`, è pensato per Vercel: importa il repository impostando
**Root Directory**: `site` e **Framework Preset**: `Next.js`, poi aggiungi le
variabili d'ambiente sopra elencate.
