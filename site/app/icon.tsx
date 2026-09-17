import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0a08",
          borderRadius: 14,
        }}
      >
        <span
          style={{
            fontSize: 30,
            fontFamily: "Georgia, serif",
            color: "#c9a876",
            letterSpacing: 1,
          }}
        >
          FD
        </span>
      </div>
    ),
    size,
  );
}
