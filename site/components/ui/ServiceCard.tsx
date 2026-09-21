import { Disc3, Speaker, Sparkles, Flame, Mic, Music, Users, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ServiceItem } from "@/data/services";

const icons: Record<ServiceItem["icon"], LucideIcon> = {
  disc: Disc3,
  speaker: Speaker,
  sparkles: Sparkles,
  flame: Flame,
  mic: Mic,
  music: Music,
  users: Users,
};

export function ServiceCard({ service }: { service: ServiceItem }) {
  const t = useTranslations("ServiceItems");
  const Icon = icons[service.icon];

  return (
    <div className="group flex items-start gap-6 border-t border-line py-8 first:border-t-0">
      <Icon className="mt-1 h-6 w-6 shrink-0 text-champagne" strokeWidth={1.25} aria-hidden />
      <div>
        <h3 className="font-display text-xl text-ivory">{t(`${service.slug}.title`)}</h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ivory-dim">
          {t(`${service.slug}.description`)}
        </p>
      </div>
    </div>
  );
}
