import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { leggiEvento } from "@/lib/eventi";

// Convenzione di file di Next.js: l'immagine viene risolta in automatico
// sul dominio reale con cui la pagina viene servita (a differenza di un
// og:image costruito a mano con un URL assoluto, che su questo progetto
// si romperebbe — SITE_URL non è mai impostato su Vercel, vedi
// scripts/seo/submit-indexnow.ts). Stesso approccio di app/[locale]/opengraph-image.tsx,
// qui personalizzato con il nome della coppia.

export const runtime = "nodejs";
export const alt = "Wedding Music Planner — Forte DJ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evento = await leggiEvento(id).catch(() => null);
  const cliente = evento?.cliente ?? "Sposi";

  const imageData = await readFile(path.join(process.cwd(), "public/images/hero-ceremony.jpg"));
  const backgroundImage = `data:image/jpeg;base64,${imageData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
        }}
      >
        <img
          src={backgroundImage}
          width={size.width}
          height={size.height}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            padding: "48px 64px",
            background: "rgba(11,10,8,0.82)",
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontFamily: "Georgia, serif",
              color: "#c9a876",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Forte DJ — Wedding Music Planner
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 56,
              fontFamily: "Georgia, serif",
              color: "#f5efe6",
            }}
          >
            {cliente}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
