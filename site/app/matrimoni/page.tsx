import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { Wedding } from "@/components/sections/Wedding";
import { Numbers } from "@/components/sections/Numbers";
import { Gallery } from "@/components/sections/Gallery";
import { Reviews } from "@/components/sections/Reviews";
import { FAQ } from "@/components/sections/FAQ";
import { FinalCTA } from "@/components/sections/FinalCTA";

export const metadata: Metadata = buildMetadata({
  title: "DJ per matrimoni a Serravalle Scrivia, Alessandria e in Piemonte",
  description:
    "DJ per matrimoni a Serravalle Scrivia (AL) e in tutto il Piemonte, Liguria e Lombardia: musica su misura per cerimonia, aperitivo, cena e party.",
  path: "/matrimoni",
});

export default function MatrimoniPage() {
  return (
    <>
      <PageHero
        eyebrow="Matrimoni"
        title="LA COLONNA SONORA DEL VOSTRO GIORNO"
        description="Dalla cerimonia al fine serata, ogni momento del matrimonio ha la sua musica, pensata insieme a voi."
      />
      <Wedding />
      <Numbers />
      <Gallery />
      <Reviews />
      <FAQ />
      <FinalCTA />
    </>
  );
}
