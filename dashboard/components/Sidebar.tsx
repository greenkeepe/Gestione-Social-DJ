"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Bot,
  Upload,
  Image as ImageIcon,
  CalendarClock,
  Calendar,
  Users,
  MessageCircle,
  MapPin,
  Search,
  Target,
  Gauge,
  Link2,
  LogOut
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "Panoramica",
    items: [
      { href: "/", label: "Panoramica", icon: LayoutDashboard },
      { href: "/eventi", label: "Eventi", icon: Calendar }
    ]
  },
  {
    label: "Contenuti",
    items: [
      { href: "/carica", label: "Carica", icon: Upload },
      { href: "/anteprima", label: "Anteprima", icon: ImageIcon },
      { href: "/contenuti", label: "Contenuti", icon: CalendarClock }
    ]
  },
  {
    label: "Crescita",
    items: [
      { href: "/lead", label: "Lead", icon: Users },
      { href: "/risposte", label: "Risposte", icon: MessageCircle },
      { href: "/locali", label: "Locali", icon: MapPin },
      { href: "/seo", label: "SEO", icon: Search }
    ]
  },
  {
    label: "Sistema",
    items: [
      { href: "/agenti", label: "Agenti", icon: Bot },
      { href: "/strategia", label: "Strategia 2027", icon: Target },
      { href: "/utilizzo", label: "Utilizzo servizi", icon: Gauge },
      { href: "/link-utili", label: "Link utili", icon: Link2 }
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const [aperta, setAperta] = useState(false);

  // Chiudi il menu mobile ogni volta che si cambia pagina.
  useEffect(() => {
    setAperta(false);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
  }

  return (
    <>
      <header className="topbar">
        <span className="topbar__brand">Gestione Social DJ</span>
        <button
          type="button"
          className="topbar__toggle"
          onClick={() => setAperta((v) => !v)}
          aria-label={aperta ? "Chiudi menu" : "Apri menu"}
          aria-expanded={aperta}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {aperta && <div className="sidebar-overlay" onClick={() => setAperta(false)} />}

      <aside className={`sidebar${aperta ? " sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <h1>Gestione Social DJ</h1>
          <p className="sub">Dashboard agenti &amp; strategia</p>
        </div>
        <nav>
          {NAV_SECTIONS.map((section) => (
            <div className="sidebar__section" key={section.label}>
              <div className="sidebar__section-label">{section.label}</div>
              {section.items.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={isActive(item.href) ? "active" : ""}
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    <ItemIcon aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <form className="logout-form" action="/api/logout" method="post">
          <button type="submit">
            <LogOut size={16} aria-hidden="true" />
            Esci
          </button>
        </form>
      </aside>
    </>
  );
}
