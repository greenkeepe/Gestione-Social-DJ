import Image from "next/image";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/Reveal";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { siteConfig } from "@/data/site";
import { aboutMedia } from "@/data/media";

export function About() {
  const t = useTranslations("About");
  const tStrengths = useTranslations("Strengths");
  const tGenres = useTranslations("MusicGenreTags");
  const strengthItems = tStrengths.raw("items") as string[];
  const genreItems = tGenres.raw("items") as string[];

  return (
    <section className="bg-charcoal py-28 md:py-40">
      <div className="container-edit grid gap-12 md:grid-cols-2 md:items-center md:gap-16">
        <Reveal>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line">
            {aboutMedia.imageSrc ? (
              <Image
                src={aboutMedia.imageSrc}
                alt={aboutMedia.imageAlt}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <PlaceholderMedia number={siteConfig.realName.charAt(0)} />
            )}
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="eyebrow mb-4">{t("eyebrow")}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="font-display text-balance text-3xl leading-tight text-ivory sm:text-4xl md:text-5xl">
              {t("titleLine1")}
              <br />
              <span className="text-champagne">{t("titleLine2")}</span>
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 text-balance leading-relaxed text-ivory-dim">
              {t("bio", {
                name: siteConfig.realName,
                years: siteConfig.yearsExperience,
              })}
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-8 flex gap-10">
              <div>
                <span className="font-display text-3xl text-champagne">
                  {siteConfig.yearsExperience}
                </span>
                <p className="text-xs uppercase tracking-wide text-ivory-dim">
                  {t("years")}
                </p>
              </div>
              <div>
                <span className="font-display text-3xl text-champagne">
                  {siteConfig.eventsCount}
                </span>
                <p className="text-xs uppercase tracking-wide text-ivory-dim">
                  {t("events")}
                </p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.28}>
            <ul className="mt-8 flex flex-col gap-3">
              {strengthItems.slice(0, 4).map((strength) => (
                <li
                  key={strength}
                  className="flex gap-3 text-sm leading-relaxed text-ivory-dim"
                >
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-champagne" />
                  {strength}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.34}>
            <div className="mt-8 flex flex-wrap gap-2">
              {genreItems.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-line px-3 py-1 text-xs text-ivory-dim"
                >
                  {genre}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
