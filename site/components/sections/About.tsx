import { Reveal } from "@/components/ui/Reveal";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { siteConfig } from "@/data/site";
import { strengths, musicGenres } from "@/data/services";

export function About() {
  return (
    <section className="bg-charcoal py-28 md:py-40">
      <div className="container-edit grid gap-12 md:grid-cols-2 md:items-center md:gap-16">
        <Reveal>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line">
            <PlaceholderMedia label="Ritratto in arrivo" />
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="eyebrow mb-4">Chi è Forte DJ</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="font-display text-balance text-3xl leading-tight text-ivory sm:text-4xl md:text-5xl">
              {siteConfig.realName}, la persona dietro la consolle
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 text-balance leading-relaxed text-ivory-dim">
              DJ per matrimoni ed eventi con {siteConfig.yearsExperience} anni
              di esperienza e un repertorio vasto e sempre aggiornato: dagli
              anni &lsquo;70/&rsquo;80/&rsquo;90 al pop, rock, dance, R&amp;B/soul,
              musica latina e lounge. Ogni playlist viene costruita su misura
              insieme ai clienti, leggendo la pista e adattando la selezione
              musicale al pubblico presente.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-8 flex gap-10">
              <div>
                <span className="font-display text-3xl text-champagne">
                  {siteConfig.yearsExperience}
                </span>
                <p className="text-xs uppercase tracking-wide text-ivory-dim">
                  Anni di esperienza
                </p>
              </div>
              <div>
                <span className="font-display text-3xl text-champagne">
                  {siteConfig.eventsCount}
                </span>
                <p className="text-xs uppercase tracking-wide text-ivory-dim">
                  Eventi realizzati
                </p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.28}>
            <ul className="mt-8 flex flex-col gap-3">
              {strengths.slice(0, 4).map((strength) => (
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
              {musicGenres.map((genre) => (
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
