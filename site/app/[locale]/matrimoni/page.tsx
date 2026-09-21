import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { Wedding } from "@/components/sections/Wedding";
import { Numbers } from "@/components/sections/Numbers";
import { Gallery } from "@/components/sections/Gallery";
import { Reviews } from "@/components/sections/Reviews";
import { FAQ } from "@/components/sections/FAQ";
import { FinalCTA } from "@/components/sections/FinalCTA";

export const metadata: Metadata = buildMetadata({
  title: "DJ per matrimoni in Piemonte, Liguria e Lombardia",
  description:
    "DJ per matrimoni in Piemonte, Liguria e Lombardia: musica su misura per cerimonia, aperitivo, cena e party, con base a Serravalle Scrivia (AL).",
  path: "/matrimoni",
});

export default function MatrimoniPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([{ name: "Matrimoni", path: "/matrimoni" }]),
          ),
        }}
      />
      <PageHero
        eyebrow="Matrimoni"
        title="LA COLONNA SONORA DEL VOSTRO GIORNO"
        description="Dalla cerimonia al fine serata, ogni momento del matrimonio ha la sua musica, pensata insieme a voi."
      />
      <Wedding hideHeading />
      <Numbers />
      <Gallery />
      <Reviews />
      <FAQ />
      <div className="bg-charcoal pb-4">
        <div className="container-edit text-center">
          <Link href="/eventi" className="eyebrow hover:text-champagne-bright">
            Organizzi un altro tipo di evento? Scopri le altre categorie →
          </Link>
        </div>
      </div>
      <FinalCTA />
    </>
  );
}
