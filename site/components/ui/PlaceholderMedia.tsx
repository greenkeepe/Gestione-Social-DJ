import { Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Segnaposto editoriale per foto/video non ancora disponibili.
 * Non deve mai essere scambiato per un evento reale: va sostituito con
 * next/image reali non appena i contenuti sono disponibili.
 *
 * Il numero (stile "tavola" di un lookbook) sostituisce l'iconcina generica
 * ripetuta ovunque: rende il placeholder un sistema editoriale coerente
 * invece di un unico asset copiato/incollato in ogni sezione. È sempre
 * puramente decorativo (aria-hidden): un'etichetta a schermo con "label"
 * viene esposta solo quando comunica un'informazione reale (es. categoria).
 */
export function PlaceholderMedia({
  label,
  number,
  className,
  tone = "dark",
  showIcon = true,
}: {
  label?: string;
  number?: string;
  className?: string;
  tone?: "dark" | "darker";
  showIcon?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        tone === "dark"
          ? "bg-gradient-to-br from-charcoal-soft via-charcoal to-ink"
          : "bg-gradient-to-br from-charcoal via-ink to-black",
        className,
      )}
      aria-hidden={label ? undefined : "true"}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <div className="grain-overlay" aria-hidden />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, rgba(201,168,118,0.18), transparent 55%), radial-gradient(circle at 80% 80%, rgba(201,168,118,0.12), transparent 50%)",
        }}
        aria-hidden
      />
      {number ? (
        <span
          className="font-display absolute -bottom-[0.15em] right-[0.05em] select-none text-[6rem] leading-none text-ivory/[0.06] sm:text-[8rem]"
          aria-hidden
        >
          {number}
        </span>
      ) : null}
      {label ? (
        <span className="eyebrow absolute bottom-4 left-4 text-champagne/50">
          {label}
        </span>
      ) : null}
      {showIcon && !number && !label ? (
        <Music2
          className="relative h-6 w-6 text-champagne/70"
          strokeWidth={1.25}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
