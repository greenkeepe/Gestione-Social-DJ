import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { processSteps } from "@/data/events";

export function Process() {
  return (
    <section className="bg-ink py-28 md:py-40">
      <div className="container-edit">
        <SectionHeading eyebrow="Come funziona" title="DALL'IDEA ALLA PISTA DA BALLO" />

        <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {processSteps.map((step, index) => (
            <Reveal key={step.number} delay={index * 0.1}>
              <div className="relative flex flex-col gap-4 border-t border-line pt-6">
                <span className="font-display text-4xl text-champagne">
                  {step.number}
                </span>
                <h3 className="font-display text-xl text-ivory">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-ivory-dim">
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
