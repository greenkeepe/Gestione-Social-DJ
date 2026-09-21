import { Star, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { siteConfig } from "@/data/site";

export function TrustBar() {
  const t = useTranslations("TrustBar");
  return (
    <section className="border-b border-line bg-ink py-8">
      <div className="container-edit flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-center">
        <div className="flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-champagne text-champagne" />
          ))}
        </div>
        <p className="text-sm text-ivory-dim">
          <span className="font-display text-lg text-ivory">
            {siteConfig.ratingValue} / 5
          </span>{" "}
          — {siteConfig.reviewsCount}+ {t("reviewsSuffix")}
        </p>
        <a
          href={siteConfig.musiquaProfileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="eyebrow hover:text-champagne-bright"
        >
          {t("musiquaLink")}
        </a>
        <a href="#preventivo" className="eyebrow flex items-center gap-1.5 hover:text-champagne-bright">
          <Zap className="h-3.5 w-3.5 text-champagne" aria-hidden />
          {t("quickQuote")}
        </a>
      </div>
    </section>
  );
}
