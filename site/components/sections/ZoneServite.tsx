import { useLocale } from "next-intl";
import { MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cities } from "@/data/cities";
import { siteConfig } from "@/data/site";

// Link alle pagine locali "DJ a <città>" (data/cities.ts), da mettere nelle
// pagine di contenuto (Matrimoni, Eventi): aiutano chi cerca un DJ nella
// propria zona e fanno capire a Google che quelle pagine sono importanti.
// Solo in italiano, come le pagine locali.
export function ZoneServite({ className = "bg-ink" }: { className?: string }) {
  const locale = useLocale();
  if (locale !== "it") return null;

  return (
    <section className={`${className} py-16 md:py-20`}>
      <div className="container-edit">
        <p className="eyebrow mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4" aria-hidden /> Zone servite
        </p>
        <p className="mb-6 max-w-2xl text-ivory-dim">
          Base a {siteConfig.baseLocation}, eventi in un raggio di {siteConfig.serviceRadius} tra {siteConfig.serviceAreas.join(", ")}.
          Cerchi un DJ nella tua zona?
        </p>
        <ul className="flex flex-wrap gap-3">
          {cities.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/dj/${c.slug}`}
                className="inline-block rounded-full border border-line px-4 py-2 text-sm text-ivory-dim transition-colors hover:border-champagne hover:text-champagne"
              >
                DJ a {c.nome}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
