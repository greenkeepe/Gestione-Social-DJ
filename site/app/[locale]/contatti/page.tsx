import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { ContactForm } from "@/components/sections/ContactForm";
import { Reveal } from "@/components/ui/Reveal";
import { siteConfig } from "@/data/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ContattiPage" });
  return buildMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/contatti",
    locale,
  });
}

export default async function ContattiPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ContattiPage" });
  const tNav = await getTranslations({ locale, namespace: "Nav" });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd(
              [{ name: tNav("contatti"), path: "/contatti" }],
              tNav("home"),
            ),
          ),
        }}
      />
      <PageHero
        eyebrow={tNav("contatti")}
        title={t("heroTitle")}
        description={t("heroDescription")}
      />

      <ContactForm />

      <section className="bg-ink pb-16">
        <div className="container-edit">
          <Reveal>
            <div className="flex flex-wrap gap-8 border-t border-line pt-8 text-sm text-ivory-dim">
              <a
                href={siteConfig.phoneHref}
                className="inline-flex items-center gap-2 hover:text-champagne"
              >
                <Phone className="h-4 w-4" aria-hidden /> {siteConfig.phone}
              </a>
              <a
                href={`mailto:${siteConfig.email}`}
                className="inline-flex items-center gap-2 hover:text-champagne"
              >
                <Mail className="h-4 w-4" aria-hidden /> {siteConfig.email}
              </a>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" aria-hidden />
                {siteConfig.serviceAreas.join(", ")}
              </span>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
