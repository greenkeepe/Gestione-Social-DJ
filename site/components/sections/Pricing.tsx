import { SectionHeading } from "@/components/ui/SectionHeading";
import { QuickQuoteForm } from "@/components/sections/QuickQuoteForm";

// Non un listino (ogni evento ha un prezzo diverso, in base a location,
// orari e servizi): la sezione fa lo stesso lavoro di una pagina prezzi
// invitando a chiedere un preventivo reale, veloce e senza impegno.
export function Pricing() {
  return (
    <section id="preventivo" className="scroll-mt-20 bg-charcoal py-28 md:py-40">
      <div className="container-edit grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
        <SectionHeading
          eyebrow="Prezzi"
          title="UN PREVENTIVO SU MISURA, NON UN LISTINO"
          description="Ogni evento è diverso: location, orari e servizi richiesti cambiano il prezzo giusto. Niente listini standard — raccontami qualche dettaglio e ti rispondo con un preventivo reale, entro poche ore e senza impegno."
        />
        <div className="mx-auto w-full max-w-md rounded-2xl border border-champagne/30 bg-charcoal-soft p-8">
          <QuickQuoteForm />
        </div>
      </div>
    </section>
  );
}
