import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const alt = "Forte DJ — DJ per matrimoni ed eventi in Piemonte, Liguria e Lombardia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const imageData = await readFile(
    path.join(process.cwd(), "public/images/gallery/wedding-sparklers-dance.jpg"),
  );
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
              fontSize: 64,
              fontFamily: "Georgia, serif",
              color: "#c9a876",
              letterSpacing: 2,
            }}
          >
            FORTE DJ
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 30,
              fontFamily: "Georgia, serif",
              color: "#f5efe6",
            }}
          >
            DJ per matrimoni ed eventi in Piemonte, Liguria e Lombardia
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
