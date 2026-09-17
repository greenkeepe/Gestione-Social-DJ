import { SectionHeading } from "@/components/ui/SectionHeading";
import { EventCard } from "@/components/ui/EventCard";
import { Reveal } from "@/components/ui/Reveal";
import { eventCategories } from "@/data/events";

export function Events() {
  const [wedding, privateEvents, corporate, party] = eventCategories;

  return (
    <section className="bg-ink py-28 md:py-40">
      <div className="container-edit">
        <SectionHeading
          eyebrow="Eventi"
          title="OGNI EVENTO HA LA SUA MUSICA"
          description="Quattro modi diversi di vivere una serata, un unico standard di cura."
        />

        <div className="mt-16 grid gap-6 lg:grid-cols-3 lg:grid-rows-2">
          <Reveal className="lg:col-span-2 lg:row-span-2">
            <EventCard
              event={wedding}
              href={`/eventi#${wedding.slug}`}
              variant="feature"
              className="h-full"
            />
          </Reveal>
          <Reveal delay={0.08}>
            <EventCard
              event={privateEvents}
              href={`/eventi#${privateEvents.slug}`}
              className="h-full"
            />
          </Reveal>
          <Reveal delay={0.16}>
            <EventCard
              event={corporate}
              href={`/eventi#${corporate.slug}`}
              className="h-full"
            />
          </Reveal>
          <Reveal delay={0.24} className="lg:col-span-3">
            <EventCard
              event={party}
              href={`/eventi#${party.slug}`}
              variant="wide"
              className="h-full"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
