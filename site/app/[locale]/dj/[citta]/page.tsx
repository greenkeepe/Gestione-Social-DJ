import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { siteConfig, technicalBaseUrl } from "@/data/site";
import { cities, trovaCitta } from "@/data/cities";
import { PageHero } from "@/components/sections/PageHero";
import { Numbers } from "@/components/sections/Numbers";
import { Reviews } from "@/components/sections/Reviews";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Accordion } from "@/components/ui/Accordion";
import { Reveal } from "@/components/ui/Reveal";

// Pagine locali "DJ a <città>" (contenuti in data/cities.ts). Solo in
// italiano: chi cerca "DJ matrimonio Genova" cerca in italiano, e versioni
// tradotte automaticamente sarebbero contenuto scarso per Google. Per le
// altre lingue l'indirizzo non esiste (404, vedi notFound() qui sotto).
// dynamicParams = true: con Next 16 e il segmento [locale] del layout le
// città elencate in generateStaticParams non venivano pre-generate (provato
// il 2026-09-29: 404 su /dj/genova); così la pagina si genera alla prima
// visita e resta in cache. Città inesistenti e lingue diverse dall'italiano
// danno comunque 404.
export const dynamicParams = true;

export async function generateStaticParams({ params }: { params: { locale?: string } | Promise<{ locale?: string }> }) {
  const { locale } = await params;
  return locale === "it" ? cities.map((c) => ({ locale: "it", citta: c.slug })) : [];
}

type Params = Promise<{ locale: string; citta: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, citta } = await params;
  const c = trovaCitta(citta);
  if (!c || locale !== "it") return {};
  const t = await getTranslations({ locale: "it", namespace: "CittaPages" });
  const title = t(`${c.chiave}MetaTitle`);
  const description = t(`${c.chiave}MetaDescription`);
  const path = `/dj/${c.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: `${technicalBaseUrl}${path}`, siteName: siteConfig.name, locale: "it_IT", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CittaPage({ params }: { params: Params }) {
  const { locale, citta } = await params;
  const c = trovaCitta(citta);
  if (!c || locale !== "it") notFound();

  const t = await getTranslations({ locale: "it", namespace: "CittaPages" });
  const tNav = await getTranslations({ locale: "it", namespace: "Nav" });
  const altre = cities.filter((x) => x.slug !== c.slug);

  // Servizio offerto in questa città (dato strutturato per Google)
  const servizioJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "DJ per matrimoni ed eventi",
    name: `DJ a ${c.nome}`,
    description: c.heroDescription,
    provider: { "@type": "EntertainmentBusiness", name: siteConfig.name, telephone: siteConfig.phone, email: siteConfig.email },
    areaServed: { "@type": "City", name: c.nome, containedInPlace: { "@type": "AdministrativeArea", name: c.regione } },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbJsonLd([{ name: `DJ a ${c.nome}`, path: `/dj/${c.slug}` }], tNav("home")),
            faqJsonLd(c.faq),
            servizioJsonLd,
          ]),
        }}
      />
      <PageHero eyebrow={`${t("eyebrow")} · ${c.nome} (${c.provincia})`} title={c.heroTitle} description={c.heroDescription} />

      <section className="bg-ink py-20 md:py-28">
        <div className="container-edit grid gap-14 md:grid-cols-5">
          <div className="space-y-6 text-lg leading-relaxed text-ivory-dim md:col-span-3">
            {c.intro.map((p, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <p>{p}</p>
              </Reveal>
            ))}
            <Reveal delay={0.2}>
              <p className="flex items-center gap-2 text-base text-champagne">
                <MapPin className="h-4 w-4" aria-hidden />
                {c.distanza === "è la mia base"
                  ? `${c.nome} è la mia base`
                  : `Da Serravalle Scrivia a ${c.nome}: ${c.distanza}`}
              </p>
            </Reveal>
          </div>
          <div className="md:col-span-2">
            <Reveal>
              <p className="eyebrow mb-4">{t("locationTitle")}</p>
              <ul className="space-y-3 text-ivory">
                {c.location.map((l) => (
                  <li key={l} className="border-b border-line pb-3">
                    {l}
                  </li>
                ))}
              </ul>
              <p className="eyebrow mb-3 mt-10">{t("zoneTitle")}</p>
              <p className="text-ivory-dim">{c.zoneVicine.join(" · ")}</p>
              <Link href="/servizi" className="eyebrow mt-8 inline-block hover:text-champagne-bright">
                {t("servizi")}
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      <Numbers />
      <Reviews />

      <section className="bg-charcoal py-24 md:py-32">
        <div className="container-edit">
          <SectionHeading eyebrow={`DJ a ${c.nome}`} title={t("faqTitle")} />
          <div className="mt-12 max-w-3xl">
            <Accordion items={c.faq} />
          </div>
          <nav aria-label={t("otherCities")} className="mt-14">
            <p className="eyebrow mb-4">{t("otherCities")}</p>
            <ul className="flex flex-wrap gap-3">
              {altre.map((x) => (
                <li key={x.slug}>
                  <Link
                    href={`/dj/${x.slug}`}
                    className="inline-block rounded-full border border-line px-4 py-2 text-sm text-ivory-dim transition-colors hover:border-champagne hover:text-champagne"
                  >
                    {x.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
