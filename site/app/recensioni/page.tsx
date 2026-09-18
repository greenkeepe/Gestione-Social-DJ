import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { Reviews } from "@/components/sections/Reviews";
import { FinalCTA } from "@/components/sections/FinalCTA";

export const metadata: Metadata = buildMetadata({
  title: "Recensioni",
  description:
    "Le esperienze di chi ha scelto Forte DJ per il proprio matrimonio o evento, raccolte su Musiqua.",
  path: "/recensioni",
});

export default function RecensioniPage() {
  return (
    <>
      <PageHero
        eyebrow="Recensioni"
        title="PAROLA A CHI C'ERA"
        description="Recensioni reali, raccolte e verificate su Musiqua."
      />
      <Reviews hideHeading />
      <FinalCTA />
    </>
  );
}
