import { Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Segnaposto editoriale per foto/video non ancora disponibili.
 * Non deve mai essere scambiato per un evento reale: va sostituito con
 * next/image reali non appena i contenuti sono disponibili.
 */
export function PlaceholderMedia({
  label,
  className,
  tone = "dark",
  showIcon = true,
}: {
  label?: string;
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
      role="img"
      aria-label={label ?? "Immagine in arrivo"}
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
      {showIcon ? (
        <div className="relative flex flex-col items-center gap-3 text-champagne/70">
          <Music2 className="h-6 w-6" strokeWidth={1.25} aria-hidden />
          {label ? (
            <span className="eyebrow text-champagne/60">{label}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
