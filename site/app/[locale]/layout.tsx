import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Playfair_Display, Inter } from "next/font/google";
import Script from "next/script";
import "../globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { MobileCTA } from "@/components/layout/MobileCTA";
import { routing } from "@/i18n/routing";
import { siteConfig, technicalBaseUrl } from "@/data/site";
import { localBusinessJsonLd } from "@/lib/seo";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const ogLocales: Record<string, string> = {
  it: "it_IT",
  en: "en_US",
  fr: "fr_FR",
  de: "de_DE",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const title = t("homeTitle");
  const description = t("homeDescription");

  return {
    metadataBase: new URL(technicalBaseUrl),
    title: {
      default: title,
      template: `%s — ${siteConfig.name}`,
    },
    description,
    openGraph: {
      title,
      description,
      siteName: siteConfig.name,
      locale: ogLocales[locale] ?? "it_IT",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: true, follow: true },
    verification: {
      google: "gAg5CfaqdgIdkVtTs3Y3ksgFLXvDcNGt317LWeZsvsE",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0a08",
  width: "device-width",
  initialScale: 1,
};

const gaId = process.env.NEXT_PUBLIC_GA_ID;
const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // Abilita il rendering statico per questa lingua invece che dinamico:
  // vedi https://next-intl.dev/docs/getting-started/app-router#static-rendering
  setRequestLocale(locale);

  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body className={`${playfair.variable} ${inter.variable} font-body`}>
        <NextIntlClientProvider>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd()) }}
          />

          {gtmId ? (
            <Script id="gtm" strategy="afterInteractive">
              {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
            </Script>
          ) : null}

          {gaId ? (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
                strategy="afterInteractive"
              />
              <Script id="ga" strategy="afterInteractive">
                {`window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${gaId}');`}
              </Script>
            </>
          ) : null}

          {metaPixelId ? (
            <Script id="meta-pixel" strategy="afterInteractive">
              {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${metaPixelId}');fbq('track', 'PageView');`}
            </Script>
          ) : null}

          <Navbar />
          <main>{children}</main>
          <Footer />
          <WhatsAppFloat />
          <MobileCTA />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
