import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildMetadata, personJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { About } from "@/components/sections/About";
import { Reviews } from "@/components/sections/Reviews";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { siteConfig } from "@/data/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ChiSonoPage" });
  return buildMetadata({
    title: t("metaTitle"),
    description: t("bio", {
      name: siteConfig.realName,
      years: siteConfig.yearsExperience,
    }),
    path: "/chi-sono",
    locale,
  });
}

export default async function ChiSonoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ChiSonoPage" });
  const tNav = await getTranslations({ locale, namespace: "Nav" });
  const bio = t("bio", {
    name: siteConfig.realName,
    years: siteConfig.yearsExperience,
  });

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
            breadcrumbJsonLd(
              [{ name: t("breadcrumb"), path: "/chi-sono" }],
              tNav("home"),
            ),
          ),
        }}
      />
      <PageHero
        eyebrow={t("breadcrumb")}
        title={t("heroTitle")}
        description={bio}
      />
      <About />
      <div className="bg-charcoal pb-4">
        <div className="container-edit text-center">
          <Link href="/servizi" className="eyebrow hover:text-champagne-bright">
            {t("servicesLink")}
          </Link>
        </div>
      </div>
      <Reviews />
      <FinalCTA />
    </>
  );
}
