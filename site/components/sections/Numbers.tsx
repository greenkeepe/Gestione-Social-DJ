import { Reveal } from "@/components/ui/Reveal";
import { CountUp } from "@/components/ui/CountUp";
import { siteConfig } from "@/data/site";

const stats = [
  { value: 20, decimals: 0, suffix: "+", label: "Anni di esperienza" },
  { value: 200, decimals: 0, suffix: "+", label: "Eventi realizzati" },
  { value: 5, decimals: 1, suffix: "", label: "Valutazione media" },
  { value: siteConfig.reviewsCount, decimals: 0, suffix: "+", label: "Recensioni verificate" },
];

export function Numbers() {
  return (
    <section className="border-y border-line bg-charcoal py-20 md:py-28">
      <div className="container-edit grid grid-cols-2 gap-10 md:grid-cols-4">
        {stats.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 0.08} className="text-center">
            <p className="font-display text-4xl text-champagne sm:text-5xl md:text-6xl">
              <CountUp value={stat.value} decimals={stat.decimals} />
              {stat.suffix}
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-ivory-dim">
              {stat.label}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
