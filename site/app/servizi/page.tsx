import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { Services } from "@/components/sections/Services";
import { Process } from "@/components/sections/Process";
import { FinalCTA } from "@/components/sections/FinalCTA";

export const metadata: Metadata = buildMetadata({
  title: "Servizi DJ per matrimoni ed eventi: audio, luci, consolle",
  description:
    "DJ set, impianto audio professionale, luci, macchina del fumo e microfoni per cerimonia: tutti i servizi Forte DJ per il tuo evento.",
  path: "/servizi",
});

export default function ServiziPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([{ name: "Servizi", path: "/servizi" }]),
          ),
        }}
      />
      <PageHero
        eyebrow="Servizi"
        title="TUTTO CIÒ CHE SERVE PER LA SERATA"
        description="Ogni servizio pensato per integrarsi con gli altri, senza soluzione di continuità."
      />
      <Services hideHeading />
      <Process />
      <FinalCTA />
    </>
  );
}
