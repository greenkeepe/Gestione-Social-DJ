import { SectionHeading } from "@/components/ui/SectionHeading";
import { Accordion } from "@/components/ui/Accordion";
import { faqItems } from "@/data/faq";

export function FAQ({
  full = false,
  hideHeading = false,
}: {
  full?: boolean;
  hideHeading?: boolean;
}) {
  const items = full ? faqItems : faqItems.slice(0, 6);

  return (
    <section className="bg-charcoal py-28 md:py-40">
      <div className="container-edit">
        {hideHeading ? null : (
          <SectionHeading eyebrow="FAQ" title="DOMANDE FREQUENTI" />
        )}
        <div className={hideHeading ? "max-w-3xl" : "mt-14 max-w-3xl"}>
          <Accordion items={items} />
        </div>
      </div>
    </section>
  );
}
