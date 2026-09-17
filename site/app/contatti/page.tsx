import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { ContactForm } from "@/components/sections/ContactForm";
import { Reveal } from "@/components/ui/Reveal";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = buildMetadata({
  title: "Contatti",
  description:
    "Racconta il tuo evento e verifica la disponibilità di Forte DJ per matrimoni, eventi privati, aziendali e party.",
  path: "/contatti",
});

export default function ContattiPage() {
  return (
    <>
      <PageHero
        eyebrow="Contatti"
        title="VERIFICA LA DISPONIBILITÀ"
        description="Raccontaci data, location e tipo di evento: ti risponderemo con la disponibilità per la tua giornata."
      />

      <section className="bg-ink pb-4">
        <div className="container-edit">
          <Reveal>
            <div className="flex flex-wrap gap-8 border-y border-line py-8 text-sm text-ivory-dim">
              <a
                href={siteConfig.phoneHref}
                className="inline-flex items-center gap-2 hover:text-champagne"
              >
                <Phone className="h-4 w-4" aria-hidden /> {siteConfig.phone}
              </a>
              <a
                href={`mailto:${siteConfig.email}`}
                className="inline-flex items-center gap-2 hover:text-champagne"
              >
                <Mail className="h-4 w-4" aria-hidden /> {siteConfig.email}
              </a>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" aria-hidden />
                {siteConfig.serviceAreas.join(", ")}
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      <ContactForm />
    </>
  );
}
