import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import type { EventCategory } from "@/data/events";

export function EventCard({
  event,
  href,
}: {
  event: EventCategory;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-charcoal-soft transition-colors duration-300 hover:border-champagne/50"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105">
          <PlaceholderMedia label={event.title} />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6 md:p-8">
        <span className="eyebrow">{event.title}</span>
        <h3 className="font-display text-2xl text-ivory md:text-3xl">
          {event.short}
        </h3>
        <p className="text-sm leading-relaxed text-ivory-dim">
          {event.description}
        </p>
        <span className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-champagne transition-transform duration-300 group-hover:translate-x-1">
          Scopri di più
          <ArrowUpRight
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </span>
      </div>
    </Link>
  );
}
