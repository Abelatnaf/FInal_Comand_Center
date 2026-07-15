import { ImageResponse } from "next/og";

const ALLOWED_SIZES = [192, 512];

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: sizeParam } = await params;
  const size = ALLOWED_SIZES.includes(Number(sizeParam)) ? Number(sizeParam) : 192;
  const glyph = Math.round(size * 0.56);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a84ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={glyph}
          height={glyph}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 18V7l8-3 8 3v11" />
          <path d="M4 18h16M9 18v-5h6v5" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
