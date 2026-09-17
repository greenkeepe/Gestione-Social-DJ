import { Reveal } from "@/components/ui/Reveal";

const lines = [
  "ARRIVA LA MUSICA.",
  "SI ACCENDONO LE LUCI.",
  "IL DANCEFLOOR SI RIEMPIE.",
  "E QUEL MOMENTO DIVENTA UN RICORDO.",
];

export function Experience() {
  return (
    <section className="relative overflow-hidden bg-charcoal py-32 md:py-48">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(201,168,118,0.10), transparent 60%)",
        }}
        aria-hidden
      />
      <div className="container-edit relative flex flex-col items-center gap-4 text-center">
        {lines.map((line, index) => (
          <Reveal key={line} delay={index * 0.15}>
            <p
              className={
                index === lines.length - 1
                  ? "font-display text-balance text-3xl text-champagne sm:text-4xl md:text-5xl"
                  : "font-display text-balance text-3xl text-ivory sm:text-4xl md:text-5xl"
              }
            >
              {line}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
