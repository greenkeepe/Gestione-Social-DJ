import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/Reveal";

export function Experience() {
  const t = useTranslations("Experience");
  const lines = [
    t("line1"),
    t("line2"),
    t("line3"),
    t("line4"),
    t("line5"),
  ];

  return (
    <section className="relative flex min-h-[80svh] items-center overflow-hidden bg-charcoal py-32 md:py-48">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(201,168,118,0.10), transparent 60%)",
        }}
        aria-hidden
      />
      <div className="grain-overlay" aria-hidden />
      <div className="container-edit relative flex flex-col items-center gap-3 text-center">
        {lines.map((line, index) => (
          <Reveal key={line} delay={index * 0.15}>
            <p
              className={
                index === lines.length - 1
                  ? "font-display text-balance text-4xl text-champagne sm:text-5xl md:text-6xl"
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
