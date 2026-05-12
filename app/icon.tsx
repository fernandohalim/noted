import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0a0a0a",
        color: "#d97757",
        fontSize: 28,
        fontWeight: 700,
        fontFamily: "monospace",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
      }}
    >
      n
    </div>,
    { ...size },
  );
}
