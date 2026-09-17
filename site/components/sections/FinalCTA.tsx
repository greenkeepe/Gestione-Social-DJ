import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-ink py-32 md:py-44">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 30%, rgba(201,168,118,0.16), transparent 60%)",
        }}
        aria-hidden
      />
      <div className="grain-overlay" aria-hidden />
      <div className="container-edit relative flex flex-col items-center text-center">
        <Reveal>
          <h2 className="font-display text-balance text-4xl leading-tight text-ivory sm:text-5xl md:text-6xl">
            PRONTO A CREARE
            <br />
            <span className="text-champagne">IL TUO MOMENTO?</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-xl text-balance text-lg text-ivory-dim">
            Raccontaci il tuo evento e scopri come possiamo trasformarlo nella
            serata che avevi immaginato.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="mt-10">
            <Button href="/contatti" size="lg">
              Verifica la disponibilità
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
