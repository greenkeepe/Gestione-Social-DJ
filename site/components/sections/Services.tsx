import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceCard } from "@/components/ui/ServiceCard";
import { Reveal } from "@/components/ui/Reveal";
import { services } from "@/data/services";

export function Services() {
  return (
    <section className="bg-ink py-28 md:py-40">
      <div className="container-edit">
        <SectionHeading
          eyebrow="Servizi"
          title="TUTTO CIÒ CHE SERVE PER LA SERATA"
          description="Ogni servizio pensato per integrarsi con gli altri, senza soluzione di continuità."
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <Reveal key={service.slug} delay={index * 0.06}>
              <ServiceCard service={service} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
