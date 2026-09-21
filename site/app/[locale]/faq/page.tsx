import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata, faqJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { FAQ } from "@/components/sections/FAQ";
import { FinalCTA } from "@/components/sections/FinalCTA";
import type { FaqItem } from "@/data/faq";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "FaqPage" });
  return buildMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/faq",
    locale,
  });
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "FAQ" });
  const tNav = await getTranslations({ locale, namespace: "Nav" });
  const tFaqItems = await getTranslations({ locale, namespace: "FaqItems" });
  const faqItems = tFaqItems.raw("items") as FaqItem[];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqItems)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([{ name: tNav("faq"), path: "/faq" }], tNav("home")),
          ),
        }}
      />
      <PageHero eyebrow={t("eyebrow")} title={t("title")} />
      <FAQ full hideHeading />
      <FinalCTA />
    </>
  );
}
