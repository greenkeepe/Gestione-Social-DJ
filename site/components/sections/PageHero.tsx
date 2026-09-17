import { Reveal } from "@/components/ui/Reveal";

export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-ink pb-20 pt-40 md:pb-28 md:pt-48">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 0%, rgba(201,168,118,0.14), transparent 55%)",
        }}
        aria-hidden
      />
      <div className="container-edit relative">
        <Reveal>
          <p className="eyebrow mb-5">{eyebrow}</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="font-display text-balance text-4xl leading-tight text-ivory sm:text-5xl md:text-6xl">
            {title}
          </h1>
        </Reveal>
        {description ? (
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-xl text-balance text-lg text-ivory-dim">
              {description}
            </p>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
