import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "noted.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#0a0a0a",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "160px",
          height: "160px",
          background: "#0a0a0a",
          color: "#d97757",
          border: "2px solid #292524", // stone-800
          borderRadius: "32px",
          marginBottom: "40px",
          fontSize: "80px",
          fontWeight: "bold",
        }}
      >
        n.
      </div>
      <h1
        style={{
          fontSize: "64px",
          fontWeight: "bold",
          color: "white",
          marginBottom: "16px",
        }}
      >
        noted.
      </h1>
      <p
        style={{
          fontSize: "32px",
          color: "#888888",
        }}
      >
        minimalist note-taking.
      </p>
    </div>,
    { ...size },
  );
}
