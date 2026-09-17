import { Disc3, Speaker, Sparkles, Flame, Mic, Music, Users, type LucideIcon } from "lucide-react";
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
  const Icon = icons[service.icon];

  return (
    <div className="group flex h-full flex-col gap-5 rounded-2xl border border-line bg-charcoal-soft/60 p-8 transition-colors duration-300 hover:border-champagne/40">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-champagne/30 text-champagne">
        <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </div>
      <h3 className="font-display text-xl text-ivory">{service.title}</h3>
      <p className="text-sm leading-relaxed text-ivory-dim">
        {service.description}
      </p>
    </div>
  );
}
