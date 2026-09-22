import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { eventCategories } from "@/data/events";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "EventiPage" });
  return buildMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/eventi",
    locale,
  });
}

export default async function EventiPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "EventiPage" });
  const tNav = await getTranslations({ locale, namespace: "Nav" });
  const tEvents = await getTranslations({ locale, namespace: "EventCategories" });

  // Anchor text differenziato per categoria (stesso link, testo più
  // pertinente al contesto invece di un'unica CTA generica ripetuta 4 volte).
  const ctaLabels: Record<string, string> = {
    matrimoni: t("ctaWedding"),
    "eventi-privati": t("ctaPrivate"),
    corporate: t("ctaCorporate"),
    party: t("ctaParty"),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd(
              [{ name: tNav("eventi"), path: "/eventi" }],
              tNav("home"),
            ),
          ),
        }}
      />
      <PageHero
        eyebrow={tNav("eventi")}
        title={t("heroTitle")}
        description={t("heroDescription")}
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
                      alt={event.imageAlt ?? tEvents(`${event.slug}.short`)}
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
                    {tEvents(`${event.slug}.short`)}
                  </h2>
                </Reveal>
                <Reveal delay={0.14}>
                  <p className="mt-5 max-w-md text-ivory-dim leading-relaxed">
                    {tEvents(`${event.slug}.description`)}
                  </p>
                </Reveal>
                <Reveal delay={0.2}>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {(tEvents.raw(`${event.slug}.includes`) as string[]).map((item) => (
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
                  <div className="mt-8 flex flex-col items-start gap-4">
                    <Button href="/#preventivo">
                      <Zap className="h-4 w-4" aria-hidden />
                      {ctaLabels[event.slug] ?? t("ctaDefault")}
                    </Button>
                    {event.slug === "matrimoni" ? (
                      <Link href="/matrimoni" className="eyebrow hover:text-champagne-bright">
                        {t("weddingPageLink")}
                      </Link>
                    ) : null}
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
