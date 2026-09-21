import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceCard } from "@/components/ui/ServiceCard";
import { Reveal } from "@/components/ui/Reveal";
import { services } from "@/data/services";

export function Services({ hideHeading = false }: { hideHeading?: boolean }) {
  const t = useTranslations("ServicesSection");
  return (
    <section className="bg-ink py-28 md:py-40">
      <div className="container-edit">
        {hideHeading ? null : (
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
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
