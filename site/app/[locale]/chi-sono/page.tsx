import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { buildMetadata, personJsonLd, breadcrumbJsonLd } from "@/lib/seo";
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([{ name: "Chi è Forte DJ", path: "/chi-sono" }]),
          ),
        }}
      />
      <PageHero
        eyebrow="Chi è Forte DJ"
        title="LA PERSONA DIETRO LA MUSICA"
        description={`${siteConfig.realName}, DJ per matrimoni ed eventi con ${siteConfig.yearsExperience} anni di esperienza.`}
      />
      <About />
      <div className="bg-charcoal pb-4">
        <div className="container-edit text-center">
          <Link href="/servizi" className="eyebrow hover:text-champagne-bright">
            Scopri tutti i servizi inclusi →
          </Link>
        </div>
      </div>
      <Reviews />
      <FinalCTA />
    </>
  );
}
