import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Accordion } from "@/components/ui/Accordion";
import type { FaqItem } from "@/data/faq";

export function FAQ({
  full = false,
  hideHeading = false,
}: {
  full?: boolean;
  hideHeading?: boolean;
}) {
  const t = useTranslations("FAQ");
  const tItems = useTranslations("FaqItems");
  const allItems = tItems.raw("items") as FaqItem[];
  const items = full ? allItems : allItems.slice(0, 6);

  return (
    <section className="bg-charcoal py-28 md:py-40">
      <div className="container-edit">
        {hideHeading ? null : (
          <SectionHeading eyebrow={t("eyebrow")} title={t("title")} />
        )}
        <div className={hideHeading ? "max-w-3xl" : "mt-14 max-w-3xl"}>
          <Accordion items={items} />
          {full ? null : (
            <Link
              href="/faq"
              className="eyebrow mt-8 inline-block hover:text-champagne-bright"
            >
              {t("viewAll")}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
