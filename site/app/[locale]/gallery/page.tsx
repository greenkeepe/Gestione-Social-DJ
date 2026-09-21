import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { Gallery } from "@/components/sections/Gallery";
import { FinalCTA } from "@/components/sections/FinalCTA";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "GalleryPage" });
  return buildMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/gallery",
    locale,
  });
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "GalleryPage" });
  const tNav = await getTranslations({ locale, namespace: "Nav" });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd(
              [{ name: tNav("gallery"), path: "/gallery" }],
              tNav("home"),
            ),
          ),
        }}
      />
      <PageHero
        eyebrow={tNav("gallery")}
        title={t("heroTitle")}
        description={t("heroDescription")}
      />
      <Gallery full hideHeading />
      <FinalCTA />
    </>
  );
}
