import { renderAppIcon } from "@/lib/app-icon";

export const contentType = "image/png";

// 32 is the browser tab favicon; 512 is what installers (Dock, home screen)
// want. Each entry is served at `/icon/<id>`.
const SIZES = [
  { id: "32", size: 32, glyph: 20 },
  { id: "512", size: 512, glyph: 340 },
];

export function generateImageMetadata() {
  return SIZES.map(({ id, size }) => ({
    id,
    size: { width: size, height: size },
    contentType,
  }));
}

// `id` arrives as a promise, like `params` does in Next 16.
export default async function Icon({ id }: { id: Promise<string> }) {
  const resolved = await id;
  const { size, glyph } = SIZES.find((s) => s.id === resolved) ?? SIZES[0];

  return renderAppIcon({ size, glyph });
}
