import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CookiePage" });
  return buildMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/cookie",
    locale,
  });
}

export default async function CookiePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CookiePage" });
  const tLegal = await getTranslations({ locale, namespace: "Legal" });

  return (
    <>
      <PageHero eyebrow={tLegal("eyebrow")} title={t("heroTitle")} />
      <section className="bg-ink pb-28">
        <div className="container-edit max-w-2xl space-y-6 text-sm leading-relaxed text-ivory-dim">
          <p>{t("p1")}</p>
          <p>{t("p2")}</p>
        </div>
      </section>
    </>
  );
}
