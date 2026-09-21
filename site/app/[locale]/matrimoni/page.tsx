import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { Wedding } from "@/components/sections/Wedding";
import { Numbers } from "@/components/sections/Numbers";
import { Gallery } from "@/components/sections/Gallery";
import { Reviews } from "@/components/sections/Reviews";
import { FAQ } from "@/components/sections/FAQ";
import { FinalCTA } from "@/components/sections/FinalCTA";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "MatrimoniPage" });
  return buildMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/matrimoni",
    locale,
  });
}

export default async function MatrimoniPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "MatrimoniPage" });
  const tNav = await getTranslations({ locale, namespace: "Nav" });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd(
              [{ name: tNav("matrimoni"), path: "/matrimoni" }],
              tNav("home"),
            ),
          ),
        }}
      />
      <PageHero
        eyebrow={tNav("matrimoni")}
        title={t("heroTitle")}
        description={t("heroDescription")}
      />
      <Wedding hideHeading />
      <Numbers />
      <Gallery />
      <Reviews />
      <FAQ />
      <div className="bg-charcoal pb-4">
        <div className="container-edit text-center">
          <Link href="/eventi" className="eyebrow hover:text-champagne-bright">
            {t("otherCategoriesLink")}
          </Link>
        </div>
      </div>
      <FinalCTA />
    </>
  );
}
