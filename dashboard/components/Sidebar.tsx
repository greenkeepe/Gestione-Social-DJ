"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Panoramica" },
  { href: "/agenti", label: "Agenti" },
  { href: "/carica", label: "Carica media" },
  { href: "/reel-ai", label: "🎬 Crea Reel AI" },
  { href: "/anteprima", label: "Anteprima" },
  { href: "/contenuti", label: "Contenuti" },
  { href: "/lead", label: "Lead" },
  { href: "/risposte", label: "Risposte" },
  { href: "/strategia", label: "Strategia 2027" },
  { href: "/utilizzo", label: "📊 Utilizzo servizi" },
  { href: "/link-utili", label: "🔗 Link utili" }
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
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? "active" : ""}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form className="logout-form" action="/api/logout" method="post">
          <button type="submit">Esci</button>
        </form>
      </aside>
    </>
  );
}
