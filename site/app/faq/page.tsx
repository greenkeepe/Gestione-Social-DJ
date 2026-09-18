import type { Metadata } from "next";
import { buildMetadata, faqJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { FAQ } from "@/components/sections/FAQ";
import { FinalCTA } from "@/components/sections/FinalCTA";

export const metadata: Metadata = buildMetadata({
  title: "Domande frequenti",
  description:
    "Prenotazioni, cerimonia, impianto audio, luci e servizi aggiuntivi: le risposte alle domande più comuni su Forte DJ.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />
      <PageHero eyebrow="FAQ" title="DOMANDE FREQUENTI" />
      <FAQ full hideHeading />
      <FinalCTA />
    </>
  );
}
