import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { cn } from "@/lib/utils";
import type { EventCategory } from "@/data/events";

type Variant = "feature" | "default" | "wide";

const imageAspect: Record<Variant, string> = {
  feature: "aspect-[4/5] md:aspect-auto md:h-full",
  default: "aspect-[4/5]",
  wide: "aspect-[21/9]",
};

export function EventCard({
  event,
  href,
  variant = "default",
  className,
}: {
  event: EventCategory;
  href: string;
  variant?: Variant;
  className?: string;
}) {
  const isWide = variant === "wide";

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-full overflow-hidden rounded-2xl border border-line bg-charcoal-soft transition-colors duration-300 hover:border-champagne/50",
        variant === "feature" ? "flex-col md:flex-col" : "flex-col",
        isWide && "sm:flex-row-reverse",
        className,
      )}
    >
      <div className={cn("relative w-full shrink-0 overflow-hidden", imageAspect[variant], isWide && "sm:w-2/5")}>
        <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105">
          <PlaceholderMedia label={event.title} />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />
      </div>
      <div
        className={cn(
          "flex flex-1 flex-col justify-center gap-3 p-6 md:p-8",
          variant === "feature" && "md:p-10",
        )}
      >
        <span className="eyebrow">{event.title}</span>
        <h3
          className={cn(
            "font-display text-ivory transition-transform duration-300 group-hover:translate-x-1",
            variant === "feature" ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl",
          )}
        >
          {event.short}
        </h3>
        <p className="max-w-sm text-sm leading-relaxed text-ivory-dim">
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
