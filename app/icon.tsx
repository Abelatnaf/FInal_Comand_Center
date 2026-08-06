import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(155deg, #26201a, #100e0b)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cfae74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 18V7l8-3 8 3v11" />
          <path d="M4 18h16M9 18v-5h6v5" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
