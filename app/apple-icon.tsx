import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0a0a0a",
        color: "#d97757",
        fontSize: 140,
        fontWeight: 700,
        fontFamily: "monospace",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      n
    </div>,
    { ...size },
  );
}
