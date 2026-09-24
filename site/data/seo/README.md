# Dati dell'SEO Engine — generati automaticamente

I file JSON in questa cartella (`gsc-data.json`, `opportunities.json`,
`internal-links.json`, `seo-proposte.json`) sono generati dagli script in
`scripts/seo/` ed eseguiti settimanalmente da `.github/workflows/seo-gsc.yml`.

**Non modificarli a mano**, con un'eccezione: `seo-proposte.json` viene
anche scritto dalla dashboard privata (pagina "SEO") quando una proposta
viene applicata o scartata — è l'unico file di questa cartella con scritture
anche fuori dal workflow settimanale. Gli altri verrebbero sovrascritti alla
prossima esecuzione. Per rigenerarli manualmente: `npm run seo:all` (vedi
`site/docs/seo-engine.md`).
