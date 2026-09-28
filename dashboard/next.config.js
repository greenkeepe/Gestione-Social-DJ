/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
