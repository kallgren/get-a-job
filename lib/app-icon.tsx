import { ImageResponse } from "next/og";

const BACKGROUND = "#2463ef";

/**
 * Renders the app icon: a Lucide briefcase on the brand blue, full bleed.
 *
 * Shared by `app/icon.tsx` and `app/apple-icon.tsx` so every generated size
 * stays visually identical. `glyph` is the briefcase's width in pixels; keep
 * it around two thirds of `size` so the icon survives maskable cropping,
 * which only guarantees the middle 80%.
 */
export function renderAppIcon({
  size,
  glyph,
}: {
  size: number;
  glyph: number;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: BACKGROUND,
        }}
      >
        {/* Briefcase icon SVG path from Lucide */}
        <svg
          width={glyph}
          height={glyph}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          <rect width="20" height="14" x="2" y="6" rx="2" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
