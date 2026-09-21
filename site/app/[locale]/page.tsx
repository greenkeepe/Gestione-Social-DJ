import { getTranslations } from "next-intl/server";
import { faqJsonLd } from "@/lib/seo";
import type { FaqItem } from "@/data/faq";
import { Hero } from "@/components/sections/Hero";
import { TrustBar } from "@/components/sections/TrustBar";
import { Intro } from "@/components/sections/Intro";
import { Wedding } from "@/components/sections/Wedding";
import { TheMoment } from "@/components/sections/TheMoment";
import { Numbers } from "@/components/sections/Numbers";
import { Events } from "@/components/sections/Events";
import { Experience } from "@/components/sections/Experience";
import { Gallery } from "@/components/sections/Gallery";
import { Showreel } from "@/components/sections/Showreel";
import { Services } from "@/components/sections/Services";
import { Reviews } from "@/components/sections/Reviews";
import { Pricing } from "@/components/sections/Pricing";
import { About } from "@/components/sections/About";
import { MusicGenres } from "@/components/sections/MusicGenres";
import { Process } from "@/components/sections/Process";
import { FAQ } from "@/components/sections/FAQ";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { ContactForm } from "@/components/sections/ContactForm";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tFaq = await getTranslations({ locale, namespace: "FaqItems" });
  const faqItems = tFaq.raw("items") as FaqItem[];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd(faqItems.slice(0, 6))),
        }}
      />
      <Hero />
      <TrustBar />
      <Intro />
      <Wedding />
      <TheMoment />
      <Numbers />
      <Events />
      <Reviews />
      <Experience />
      <Gallery />
      <Showreel />
      <Services />
      <Pricing />
      <About />
      <MusicGenres />
      <Process />
      <FAQ />
      <FinalCTA />
      <ContactForm />
    </>
  );
}
