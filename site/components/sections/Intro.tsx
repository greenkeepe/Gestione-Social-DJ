import { Reveal } from "@/components/ui/Reveal";

export function Intro() {
  return (
    <section id="intro" className="relative bg-ink py-28 md:py-40">
      <div className="container-edit">
        <div className="grid gap-10 md:grid-cols-12 md:gap-6">
          <div className="md:col-span-4">
            <Reveal>
              <p className="eyebrow">Forte DJ</p>
            </Reveal>
          </div>
          <div className="md:col-span-8">
            <Reveal delay={0.08}>
              <h2 className="font-display text-balance text-3xl leading-[1.15] text-ivory sm:text-4xl md:text-5xl">
                NON È SOLO MUSICA.
                <br />
                <span className="text-champagne">
                  È L&rsquo;ATMOSFERA CHE RICORDERAI.
                </span>
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-8 max-w-xl text-balance text-lg leading-relaxed text-ivory-dim">
                Forte DJ costruisce esperienze musicali intorno alle persone,
                all&rsquo;atmosfera e ai momenti più importanti del tuo evento —
                leggendo la pista e adattando ogni scelta a chi la vive.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
