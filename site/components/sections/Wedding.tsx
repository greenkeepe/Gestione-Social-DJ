import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { weddingMoments } from "@/data/events";

export function Wedding() {
  return (
    <section className="bg-charcoal py-28 md:py-40">
      <div className="container-edit">
        <SectionHeading
          eyebrow="Matrimoni"
          title={
            <>
              IL TUO MATRIMONIO.
              <br />
              <span className="text-champagne">
                LA COLONNA SONORA DEL TUO GIORNO.
              </span>
            </>
          }
        />

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {weddingMoments.map((moment, index) => (
            <Reveal key={moment.key} delay={index * 0.06}>
              <div className="flex h-full flex-col gap-3 bg-ink p-8">
                <span className="font-display text-3xl text-champagne">
                  0{index + 1}
                </span>
                <h3 className="font-display text-xl text-ivory">
                  {moment.title}
                </h3>
                <p className="text-sm leading-relaxed text-ivory-dim">
                  {moment.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-14 flex justify-center">
            <Button href="/matrimoni" size="lg">
              Parliamo del tuo matrimonio
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
