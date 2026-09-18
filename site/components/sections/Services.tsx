import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceCard } from "@/components/ui/ServiceCard";
import { Reveal } from "@/components/ui/Reveal";
import { services } from "@/data/services";

export function Services({ hideHeading = false }: { hideHeading?: boolean }) {
  return (
    <section className="bg-ink py-28 md:py-40">
      <div className="container-edit">
        {hideHeading ? null : (
          <SectionHeading
            eyebrow="Servizi"
            title="TUTTO CIÒ CHE SERVE PER LA SERATA"
            description="Ogni servizio pensato per integrarsi con gli altri, senza soluzione di continuità."
          />
        )}

        <div className={hideHeading ? "max-w-2xl" : "mt-16 max-w-2xl"}>
          {services.map((service, index) => (
            <Reveal key={service.slug} delay={index * 0.05}>
              <ServiceCard service={service} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
