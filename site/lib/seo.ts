import type { Metadata } from "next";
import { siteConfig, technicalBaseUrl } from "@/data/site";
import { faqItems } from "@/data/faq";
import { routing } from "@/i18n/routing";

const ogLocales: Record<string, string> = {
  it: "it_IT",
  en: "en_US",
  fr: "fr_FR",
  de: "de_DE",
};

function localizedPath(path: string, locale: string) {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

export function buildMetadata(opts: {
  title: string;
  description: string;
  path: string;
  locale: string;
}): Metadata {
  const { title, description, path, locale } = opts;
  const canonicalPath = localizedPath(path, locale);
  const url = `${technicalBaseUrl}${canonicalPath}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, localizedPath(path, l)]),
      ),
    },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      locale: ogLocales[locale] ?? "it_IT",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// Attività di intrattenimento — solo fatti confermati in config/brand.json.
// Coordinate di Serravalle Scrivia (AL) approssimate: da verificare/correggere
// con un pin preciso su Google Maps prima di considerarle definitive.
export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "EntertainmentBusiness",
    name: siteConfig.name,
    description: siteConfig.description,
    ...(siteConfig.url ? { url: siteConfig.url } : {}),
    email: siteConfig.email,
    telephone: siteConfig.phone,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Serravalle Scrivia",
      addressRegion: "AL",
      addressCountry: "IT",
    },
    areaServed: {
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: 44.7167,
        longitude: 8.85,
      },
      geoRadius: "150000",
    },
    founder: {
      "@type": "Person",
      name: siteConfig.realName,
      jobTitle: "DJ",
    },
    sameAs: [siteConfig.instagramUrl, siteConfig.musiquaProfileUrl].filter(Boolean),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5.0",
      bestRating: "5",
      worstRating: "1",
      reviewCount: siteConfig.reviewsCount,
    },
  };
}

// Entità "persona" per la pagina /chi-sono — solo fatti confermati.
export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.realName,
    alternateName: siteConfig.name,
    jobTitle: "DJ per matrimoni ed eventi",
    description: `${siteConfig.realName}, DJ per matrimoni ed eventi con ${siteConfig.yearsExperience} anni di esperienza, attivo in ${siteConfig.serviceAreas.join(", ")}.`,
    ...(siteConfig.url ? { url: `${siteConfig.url}/chi-sono` } : {}),
    sameAs: [siteConfig.instagramUrl].filter(Boolean),
  };
}

// Breadcrumb di navigazione (solo dato strutturato, nessun elemento visivo).
export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
  homeName = "Home",
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: homeName, path: "" },
      ...items,
    ].map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${technicalBaseUrl}${item.path}`,
    })),
  };
}

export function faqJsonLd(items: typeof faqItems = faqItems) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
