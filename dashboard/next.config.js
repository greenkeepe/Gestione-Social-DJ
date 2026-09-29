/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Su Vercel la dashboard viene costruita dentro l'intero repository: lib/dataSource.ts
    // legge da ".." (solo come ripiego in sviluppo locale, online i dati arrivano da GitHub),
    // e il tracciamento dei file includeva in OGNI funzione tutto il resto del repository
    // (brani di Regia, video del sito...). Funzioni troppo pesanti -> Vercel le spezza e
    // supera il limite di 12 del piano gratuito ("No more than 12 Serverless Functions").
    outputFileTracingExcludes: {
      "*": ["../.git/**", "../.github/**", "../agents/**", "../config/**", "../data/**", "../docs/**", "../lib/**", "../node_modules/**", "../regia/**", "../scripts/**", "../site/**", "../.env.example", "../.gitignore", "../README.md", "../package-lock.json", "../package.json", "../tsconfig.json"]
    }
  },
  images: {
    // Le miniature (foto/video in coda, storico pubblicazioni) arrivano da
    // DASHBOARD_PUBLIC_URL + /api/r2-file/... (URL assoluto: serve a
    // Instagram/Facebook per scaricare i media, vedi app/api/r2-file). Stesso
    // dominio della dashboard: qui serve solo perché next/image richiede
    // un elenco esplicito di host anche per il proprio dominio quando l'URL
    // passato è assoluto e non relativo.
    remotePatterns: [{ protocol: "https", hostname: "gestione-social-dj.vercel.app", pathname: "/api/r2-file/**" }]
  }
};

module.exports = nextConfig;
