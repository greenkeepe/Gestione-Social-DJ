import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
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
                LA SUA COLONNA SONORA.
              </span>
            </>
          }
        />

        <div className="relative mt-20 flex flex-col gap-16 md:mt-28 md:gap-28">
          <div
            className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-line md:block"
            aria-hidden
          />
          {weddingMoments.map((moment, index) => {
            const reversed = index % 2 === 1;
            return (
              <div
                key={moment.key}
                className="relative grid items-center gap-6 md:grid-cols-2 md:gap-16"
              >
                <Reveal
                  className={reversed ? "md:order-2" : undefined}
                  y={28}
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line">
                    <PlaceholderMedia label={moment.title} />
                  </div>
                </Reveal>
                <Reveal
                  delay={0.1}
                  className={reversed ? "md:text-right" : undefined}
                >
                  <span className="font-display text-5xl text-champagne md:text-6xl">
                    0{index + 1}
                  </span>
                  <h3 className="mt-2 font-display text-2xl text-ivory md:text-3xl">
                    {moment.title}
                  </h3>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-ivory-dim md:ml-auto md:mr-0">
                    {moment.description}
                  </p>
                </Reveal>
              </div>
            );
          })}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-20 flex justify-center md:mt-28">
            <Button href="/matrimoni" size="lg">
              Parliamo del tuo matrimonio
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
