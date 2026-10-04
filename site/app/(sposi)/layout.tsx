import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "../globals.css";

// Root layout separato per /questionario-sposi: stessi font e stile scuro/
// champagne del sito pubblico, ma SENZA Navbar/Footer/i18n — è una pagina
// privata "non annunciata" (nessun link in nav o sitemap, noindex qui
// sotto), il cui URL Andrea manda a mano via WhatsApp solo a chi ha già
// prenotato. Stesso schema di app/(admin)/layout.tsx per /admin/seo.
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wedding Music Planner — Forte DJ",
  robots: { index: false, follow: false },
};

export default function SposiRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className={`${playfair.variable} ${inter.variable} font-body`}>
        {children}
      </body>
    </html>
  );
}
