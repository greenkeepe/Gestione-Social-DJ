import Link from "next/link";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <h1>Gestione Social DJ</h1>
      <p className="sub">Dashboard agenti &amp; strategia</p>
      <nav>
        <Link href="/">Panoramica</Link>
        <Link href="/agenti">Agenti</Link>
        <Link href="/contenuti">Contenuti</Link>
        <Link href="/lead">Lead</Link>
        <Link href="/strategia">Strategia 2027</Link>
      </nav>
      <form className="logout-form" action="/api/logout" method="post">
        <button type="submit">Esci</button>
      </form>
    </aside>
  );
}
