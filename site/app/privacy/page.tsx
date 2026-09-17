import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: "Informazioni sul trattamento dei dati personali raccolti tramite questo sito.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Legale" title="PRIVACY POLICY" />
      <section className="bg-ink pb-28">
        <div className="container-edit max-w-2xl space-y-6 text-sm leading-relaxed text-ivory-dim">
          <p>
            Questa pagina è un segnaposto: contenuto da completare con
            un&rsquo;informativa privacy conforme al GDPR prima della
            pubblicazione del sito, redatta insieme a un consulente legale o
            un servizio dedicato.
          </p>
          <p>
            I dati raccolti tramite il modulo di contatto (nome, email,
            telefono e dettagli dell&rsquo;evento) vengono utilizzati
            esclusivamente per rispondere alla richiesta di disponibilità.
          </p>
          <p>
            Per qualsiasi domanda sul trattamento dei tuoi dati puoi scrivere
            a{" "}
            <a href={`mailto:${siteConfig.email}`} className="text-champagne underline-offset-4 hover:underline">
              {siteConfig.email}
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
