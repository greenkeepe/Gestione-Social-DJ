"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/matrimoni", label: "Matrimoni" },
  { href: "/eventi", label: "Eventi" },
  { href: "/servizi", label: "Servizi" },
  { href: "/#preventivo", label: "Prezzi" },
  { href: "/gallery", label: "Gallery" },
  { href: "/recensioni", label: "Recensioni" },
  { href: "/faq", label: "FAQ" },
  { href: "/contatti", label: "Contatti" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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
      <div className="container-edit flex h-20 items-center justify-between">
        <Link
          href="/"
          className="font-display text-xl tracking-[0.15em] text-ivory"
        >
          FORTE DJ
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Navigazione principale">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm tracking-wide text-ivory-dim transition-colors hover:text-champagne",
                pathname === link.href && "text-champagne",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Button href="/contatti" size="md">
            Verifica la disponibilità
          </Button>
        </div>

        <button
          type="button"
          className="p-2 text-ivory lg:hidden"
          aria-label={open ? "Chiudi menu" : "Apri menu"}
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
            aria-label="Navigazione mobile"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-3 font-display text-lg text-ivory-dim transition-colors hover:bg-charcoal-soft hover:text-champagne",
                  pathname === link.href && "text-champagne",
                )}
              >
                {link.label}
              </Link>
            ))}
            <Button
              href="/contatti"
              onClick={() => setOpen(false)}
              className="mt-4 w-full"
            >
              Verifica la disponibilità
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
