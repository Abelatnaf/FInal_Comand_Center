import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#007aff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="104" height="104" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 18V7l8-3 8 3v11" />
          <path d="M4 18h16M9 18v-5h6v5" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
