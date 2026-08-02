import { renderAppIcon } from "@/lib/app-icon";

// Image metadata
export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

// Image generation
export default function AppleIcon() {
  return renderAppIcon({ size: size.width, glyph: 120 });
}
