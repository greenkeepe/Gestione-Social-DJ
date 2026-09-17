import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";

export const metadata: Metadata = buildMetadata({
  title: "Cookie Policy",
  description: "Informazioni sui cookie e sugli script di terze parti utilizzati da questo sito.",
  path: "/cookie",
});

export default function CookiePage() {
  return (
    <>
      <PageHero eyebrow="Legale" title="COOKIE POLICY" />
      <section className="bg-ink pb-28">
        <div className="container-edit max-w-2xl space-y-6 text-sm leading-relaxed text-ivory-dim">
          <p>
            Questa pagina è un segnaposto: contenuto da completare con
            un&rsquo;informativa cookie conforme prima della pubblicazione del
            sito, comprensiva di un banner di consenso reale (nessun
            meccanismo di consenso è ancora implementato).
          </p>
          <p>
            Il sito integra il widget recensioni di Musiqua e, se configurati
            tramite variabili d&rsquo;ambiente, script di analytics (Google
            Analytics, Google Tag Manager, Meta Pixel): ciascuno può
            impostare cookie o tecnologie simili secondo le proprie policy.
          </p>
        </div>
      </section>
    </>
  );
}
