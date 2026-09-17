import Script from "next/script";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/data/site";

export function Reviews() {
  return (
    <section className="bg-charcoal py-28 md:py-40">
      <div className="container-edit">
        <SectionHeading
          eyebrow="Recensioni"
          title="PAROLA A CHI HA GIÀ VISSUTO LA SERATA"
          description="Le esperienze di chi ha scelto Forte DJ per il proprio momento speciale."
          align="center"
        />

        <div className="musiqua-widget-wrap mx-auto mt-14 max-w-4xl rounded-2xl border border-line bg-ivory p-1 sm:p-4">
          <div id="musiqua-reviews-widget" />
          <Script src={siteConfig.musiquaWidgetSrc} strategy="lazyOnload" />
        </div>

        <div className="mt-10 flex flex-col items-center gap-4">
          <a
            href={siteConfig.musiquaProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-champagne underline-offset-4 hover:underline"
          >
            Vedi tutte le recensioni su Musiqua
          </a>
          <Button href="/contatti" size="lg">
            Verifica la disponibilità
          </Button>
        </div>
      </div>
    </section>
  );
}
