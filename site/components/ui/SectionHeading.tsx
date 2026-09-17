import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/Reveal";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <Reveal>
          <p className="eyebrow mb-4">{eyebrow}</p>
        </Reveal>
      ) : null}
      <Reveal delay={0.08}>
        <h2 className="font-display text-balance text-4xl leading-[1.1] text-ivory sm:text-5xl md:text-6xl">
          {title}
        </h2>
      </Reveal>
      {description ? (
        <Reveal delay={0.16}>
          <p className="mt-6 text-balance text-lg leading-relaxed text-ivory-dim">
            {description}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}
