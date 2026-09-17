import type { Metadata } from "next";
import { siteConfig, technicalBaseUrl } from "@/data/site";
import { faqItems } from "@/data/faq";

export function buildMetadata(opts: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const { title, description, path } = opts;
  const url = `${technicalBaseUrl}${path}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      locale: "it_IT",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// Person + servizio musicale — solo fatti confermati in config/brand.json.
export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: siteConfig.name,
    description: siteConfig.description,
    ...(siteConfig.url ? { url: siteConfig.url } : {}),
    email: siteConfig.email,
    telephone: siteConfig.phone,
    areaServed: siteConfig.serviceAreas,
    genre: [
      "Wedding DJ",
      "Party DJ",
      "Event entertainment",
    ],
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

export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
