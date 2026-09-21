import "../globals.css";

// Root layout separato per /admin/*: nessun font/Navbar/Footer/i18n
// pubblico, la dashboard interna ha una sua interfaccia minimale
// autosufficiente (vedi app/(admin)/admin/seo/page.tsx). Non è raggiungibile
// dal pubblico: protetto da Basic Auth in proxy.ts.
export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
