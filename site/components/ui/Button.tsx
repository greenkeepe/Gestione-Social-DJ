import { Link } from "@/i18n/navigation";
import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-wide transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-champagne text-ink hover:bg-champagne-bright shadow-[0_0_0_1px_rgba(201,168,118,0.4)] hover:shadow-[0_0_30px_rgba(201,168,118,0.35)]",
  secondary:
    "border border-ivory/30 text-ivory hover:border-champagne hover:text-champagne",
  ghost: "text-ivory/80 hover:text-champagne",
};

const sizes: Record<Size, string> = {
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

type ButtonOwnProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
};

type ButtonAsButton = ButtonOwnProps &
  ComponentPropsWithoutRef<"button"> & { href?: undefined };

type ButtonAsLink = ButtonOwnProps &
  ComponentPropsWithoutRef<typeof Link> & { href: string };

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "primary", size = "md", className, ...rest } = props;
  const classes = cn(base, variants[variant], sizes[size], className);

  if ("href" in rest && rest.href) {
    const { href, ...linkRest } = rest as ButtonAsLink;
    return <Link href={href} className={classes} {...linkRest} />;
  }

  const buttonRest = rest as ComponentPropsWithoutRef<"button">;
  return <button className={classes} {...buttonRest} />;
}
