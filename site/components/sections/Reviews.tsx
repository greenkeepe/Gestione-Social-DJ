import { Star } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { TestimonialCard } from "@/components/ui/TestimonialCard";
import { testimonials } from "@/data/testimonials";
import { siteConfig } from "@/data/site";

export function Reviews() {
  return (
    <section id="recensioni" className="bg-charcoal py-28 md:py-40">
      <div className="container-edit">
        <SectionHeading
          eyebrow="Recensioni"
          title={`${siteConfig.reviewsCount} VOLTE UNA STORIA DA RACCONTARE`}
          description="Le esperienze di chi ha scelto Forte DJ per il proprio momento speciale."
          align="center"
        />
        <Reveal delay={0.1}>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="flex items-center gap-1" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-champagne text-champagne" />
              ))}
            </div>
            <span className="text-sm text-ivory-dim">
              <span className="font-display text-lg text-ivory">{siteConfig.ratingValue}</span>{" "}
              su 5 — verificato su Musiqua
            </span>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.15}>
        <div className="reviews-marquee-viewport mt-14">
          <div className="reviews-marquee-track">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={`a-${testimonial.name}-${index}`} testimonial={testimonial} />
            ))}
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={`b-${testimonial.name}-${index}`}
                testimonial={testimonial}
                ariaHidden
                className="reviews-marquee-duplicate"
              />
            ))}
          </div>
        </div>
      </Reveal>

      <div className="container-edit">
        <div className="mt-10 flex flex-col items-center gap-4">
          <a
            href={siteConfig.musiquaProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="eyebrow hover:text-champagne-bright"
          >
            Leggi tutte le recensioni →
          </a>
          <Button href="/contatti" size="lg">
            Verifica la disponibilità
          </Button>
        </div>
      </div>
    </section>
  );
}
