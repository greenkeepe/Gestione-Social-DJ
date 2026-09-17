import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { About } from "@/components/sections/About";
import { Reviews } from "@/components/sections/Reviews";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = buildMetadata({
  title: "Chi è Forte DJ",
  description: `${siteConfig.realName}, DJ per matrimoni ed eventi con ${siteConfig.yearsExperience} anni di esperienza.`,
  path: "/chi-sono",
});

export default function ChiSonoPage() {
  return (
    <>
      <PageHero
        eyebrow="Chi è Forte DJ"
        title="LA PERSONA DIETRO LA MUSICA"
        description={`${siteConfig.realName}, DJ per matrimoni ed eventi con ${siteConfig.yearsExperience} anni di esperienza.`}
      />
      <About />
      <Reviews />
      <FinalCTA />
    </>
  );
}
