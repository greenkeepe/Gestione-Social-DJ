"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";

const localeLabels: Record<string, string> = {
  it: "IT",
  en: "EN",
  fr: "FR",
  de: "DE",
};

function useNavLinks() {
  const t = useTranslations("Nav");
  return [
    { href: "/", label: t("home") },
    { href: "/matrimoni", label: t("matrimoni") },
    { href: "/eventi", label: t("eventi") },
    { href: "/servizi", label: t("servizi") },
    { href: "/#preventivo", label: t("prezzi") },
    { href: "/gallery", label: t("gallery") },
    { href: "/recensioni", label: t("recensioni") },
    { href: "/faq", label: t("faq") },
    { href: "/contatti", label: t("contatti") },
  ];
}

// Un link come "/#preventivo" punta alla home ma a una sezione precisa:
// senza controllare anche l'hash corrente, "Home" e "Prezzi" risultano
// entrambi (o nessuno dei due) attivi in modo scorretto quando si arriva
// direttamente su un'ancora.
function isLinkActive(href: string, pathname: string, hash: string): boolean {
  const [linkPath, linkHash] = href.split("#");
  if (pathname !== linkPath) return false;
  return linkHash ? hash === `#${linkHash}` : hash === "";
}

function subscribeToHashChange(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function getHashSnapshot() {
  return window.location.hash;
}

function getServerHashSnapshot() {
  return "";
}

function LanguageSwitcher({ pathname }: { pathname: string }) {
  const t = useTranslations("Nav");
  const activeLocale = useLocale();

  return (
    <div className="flex items-center gap-1 text-xs" aria-label={t("changeLanguage")}>
      {routing.locales.map((loc, index) => (
        <span key={loc} className="flex items-center gap-1">
          {index > 0 ? <span className="text-ivory-dim/40">/</span> : null}
          <Link
            href={pathname}
            locale={loc}
            className={cn(
              "tracking-wide transition-colors hover:text-champagne",
              loc === activeLocale ? "text-champagne" : "text-ivory-dim",
            )}
            aria-current={loc === activeLocale ? "true" : undefined}
          >
            {localeLabels[loc] ?? loc.toUpperCase()}
          </Link>
        </span>
      ))}
    </div>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navLinks = useNavLinks();
  const t = useTranslations("Nav");
  // usePathname da solo non basta per link come "/#preventivo": la parte
  // dopo "#" va letta direttamente dal browser (e aggiornata quando cambia).
  const hash = useSyncExternalStore(subscribeToHashChange, getHashSnapshot, getServerHashSnapshot);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled || open
          ? "border-b border-line bg-ink/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-edit flex h-20 items-center justify-between gap-4">
        <Link
          href="/"
          className="font-display text-xl tracking-[0.15em] text-ivory"
        >
          FORTE DJ
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label={t("mainNav")}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm tracking-wide text-ivory-dim transition-colors hover:text-champagne",
                isLinkActive(link.href, pathname, hash) && "text-champagne",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-6 lg:flex">
          <LanguageSwitcher pathname={pathname} />
          <Button href="/contatti" size="md">
            {t("checkAvailability")}
          </Button>
        </div>

        <button
          type="button"
          className="p-2 text-ivory lg:hidden"
          aria-label={open ? t("closeMenu") : t("openMenu")}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div
        id="mobile-menu"
        className={cn(
          "grid overflow-hidden transition-all duration-400 ease-out lg:hidden",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 border-t border-line bg-ink">
          <nav
            className="container-edit flex flex-col gap-1 py-6"
            aria-label={t("mobileNav")}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-3 font-display text-lg text-ivory-dim transition-colors hover:bg-charcoal-soft hover:text-champagne",
                  isLinkActive(link.href, pathname, hash) && "text-champagne",
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 px-3">
              <LanguageSwitcher pathname={pathname} />
            </div>
            <Button
              href="/contatti"
              onClick={() => setOpen(false)}
              className="mt-4 w-full"
            >
              {t("checkAvailability")}
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
