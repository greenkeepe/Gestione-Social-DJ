import { SectionHeading } from "@/components/ui/SectionHeading";
import { EventCard } from "@/components/ui/EventCard";
import { Reveal } from "@/components/ui/Reveal";
import { eventCategories } from "@/data/events";

export function Events() {
  return (
    <section className="bg-ink py-28 md:py-40">
      <div className="container-edit">
        <SectionHeading
          eyebrow="Eventi"
          title="OGNI EVENTO HA LA SUA MUSICA"
          description="Quattro modi diversi di vivere una serata, un unico standard di cura."
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {eventCategories.map((event, index) => (
            <Reveal key={event.slug} delay={index * 0.08}>
              <EventCard event={event} href={`/eventi#${event.slug}`} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
