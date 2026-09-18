import type { Metadata } from "next";
import Image from "next/image";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { eventCategories } from "@/data/events";

export const metadata: Metadata = buildMetadata({
  title: "DJ per eventi privati, aziendali e party in Piemonte",
  description:
    "DJ per eventi in Piemonte, Liguria e Lombardia: compleanni, diciottesimi, feste private, eventi aziendali e party ad alta energia, con l'atmosfera giusta per ogni occasione.",
  path: "/eventi",
});

// Anchor text differenziato per categoria (stesso link, testo più
// pertinente al contesto invece di un'unica CTA generica ripetuta 4 volte).
const ctaLabels: Record<string, string> = {
  matrimoni: "Verifica la disponibilità per il tuo matrimonio",
  "eventi-privati": "Verifica la disponibilità per la tua festa",
  corporate: "Richiedi disponibilità per il tuo evento aziendale",
  party: "Verifica la disponibilità per il tuo party",
};

export default function EventiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([{ name: "Eventi", path: "/eventi" }]),
          ),
        }}
      />
      <PageHero
        eyebrow="Eventi"
        title="OGNI EVENTO HA LA SUA MUSICA"
        description="Quattro modi diversi di vivere una serata, un unico standard di cura nei dettagli."
      />

      <section className="bg-ink pb-28 md:pb-40">
        <div className="container-edit flex flex-col gap-24">
          {eventCategories.map((event, index) => (
            <div
              key={event.slug}
              id={event.slug}
              className="scroll-mt-24 grid gap-8 md:grid-cols-2 md:items-center md:gap-16"
            >
              <Reveal
                className={index % 2 === 1 ? "md:order-2" : undefined}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line">
                  {event.imageSrc ? (
                    <Image
                      src={event.imageSrc}
                      alt={event.imageAlt ?? event.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <PlaceholderMedia number={`0${index + 1}`} />
                  )}
                </div>
              </Reveal>
              <div>
                <Reveal>
                  <span className="eyebrow">{event.title}</span>
                </Reveal>
                <Reveal delay={0.08}>
                  <h2 className="mt-4 font-display text-3xl text-ivory sm:text-4xl">
                    {event.short}
                  </h2>
                </Reveal>
                <Reveal delay={0.14}>
                  <p className="mt-5 max-w-md text-ivory-dim leading-relaxed">
                    {event.description}
                  </p>
                </Reveal>
                <Reveal delay={0.2}>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {event.includes.map((item) => (
                      <li
                        key={item}
                        className="rounded-full border border-line px-3 py-1 text-xs text-ivory-dim"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </Reveal>
                <Reveal delay={0.26}>
                  <div className="mt-8">
                    <Button href="/contatti">
                      {ctaLabels[event.slug] ?? "Verifica la disponibilità"}
                    </Button>
                  </div>
                </Reveal>
              </div>
            </div>
          ))}
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
