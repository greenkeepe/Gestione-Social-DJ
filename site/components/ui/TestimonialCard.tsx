"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Testimonial } from "@/data/testimonials";

const TRUNCATE_LENGTH = 220;

export function TestimonialCard({
  testimonial,
  ariaHidden = false,
  className,
}: {
  testimonial: Testimonial;
  ariaHidden?: boolean;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = testimonial.quote.length > TRUNCATE_LENGTH;
  const displayQuote =
    isLong && !expanded
      ? `${testimonial.quote.slice(0, TRUNCATE_LENGTH).trimEnd()}…`
      : testimonial.quote;

  return (
    <div
      className={cn(
        "flex w-[min(24rem,84vw)] shrink-0 flex-col gap-4 rounded-2xl border border-line bg-charcoal-soft p-6 sm:p-7",
        className,
      )}
      aria-hidden={ariaHidden || undefined}
    >
      <div className="flex items-center gap-1" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-champagne text-champagne" />
        ))}
      </div>

      <p className="flex-1 text-sm leading-relaxed text-ivory-dim">{displayQuote}</p>

      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          tabIndex={ariaHidden ? -1 : 0}
          className="self-start text-xs font-medium uppercase tracking-wide text-champagne hover:text-champagne-bright"
        >
          {expanded ? "Mostra meno" : "Leggi tutto"}
        </button>
      ) : null}

      <div className="mt-auto border-t border-line pt-4">
        <p className="font-display text-base text-ivory">{testimonial.name}</p>
        <p className="text-xs text-ivory-dim/80">
          {testimonial.eventType} · {testimonial.date}
        </p>
      </div>
    </div>
  );
}
