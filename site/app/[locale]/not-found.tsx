import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="flex min-h-[100svh] flex-col items-center justify-center bg-ink px-6 text-center">
      <p className="eyebrow mb-6">404</p>
      <h1 className="font-display text-balance text-3xl leading-tight text-ivory sm:text-4xl md:text-5xl">
        QUESTA PAGINA HA CAMBIATO SERATA.
      </h1>
      <div className="mt-10">
        <Button href="/" size="lg">
          Torna alla home
        </Button>
      </div>
    </section>
  );
}
