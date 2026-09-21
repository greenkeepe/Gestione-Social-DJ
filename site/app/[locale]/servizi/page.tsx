import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { Services } from "@/components/sections/Services";
import { Process } from "@/components/sections/Process";
import { FinalCTA } from "@/components/sections/FinalCTA";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ServiziPage" });
  return buildMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/servizi",
    locale,
  });
}

export default async function ServiziPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ServiziPage" });
  const tNav = await getTranslations({ locale, namespace: "Nav" });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd(
              [{ name: tNav("servizi"), path: "/servizi" }],
              tNav("home"),
            ),
          ),
        }}
      />
      <PageHero
        eyebrow={tNav("servizi")}
        title={t("heroTitle")}
        description={t("heroDescription")}
      />
      <Services hideHeading />
      <div className="bg-ink pb-4">
        <div className="container-edit text-center">
          <Link href="/chi-sono" className="eyebrow hover:text-champagne-bright">
            {t("aboutLink")}
          </Link>
        </div>
      </div>
      <Process />
      <FinalCTA />
    </>
  );
}
