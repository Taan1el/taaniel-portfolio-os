import { createAppIcon } from "../app-icon";

/**
 * Markdown - the familiar "M + down arrow" mark, set in a slate plate.
 *
 * Two flat slate tones give the Windows 11 framed-tile read; the glyphs are
 * filled polygons, never strokes, so they stay crisp when scaled down.
 */
export const MarkdownIcon = createAppIcon("MarkdownIcon", {
  full: (
    <>
      <rect x="4" y="10" width="40" height="28" rx="4" fill="#1F2933" />
      <rect x="6" y="12" width="36" height="24" rx="3" fill="#2E3A47" />
      {/* M */}
      <path
        d="M9 31 L9 17 L13.5 17 L17 22 L20.5 17 L25 17 L25 31 L21 31 L21 23.5 L17 28.5 L13 23.5 L13 31 Z"
        fill="#FFFFFF"
      />
      {/* Down arrow */}
      <path
        d="M31.5 16 L36.5 16 L36.5 23 L40 23 L34 31 L28 23 L31.5 23 Z"
        fill="#FFFFFF"
      />
    </>
  ),
  micro: (
    <>
      <rect x="3" y="8" width="42" height="32" rx="4" fill="#1F2933" />
      <path
        d="M7 33 L7 15 L13 15 L16 20 L19 15 L25 15 L25 33 L19.5 33 L19.5 24 L16 29 L12.5 24 L12.5 33 Z"
        fill="#FFFFFF"
      />
      <path
        d="M32 15 L38 15 L38 23 L42 23 L35 34 L28 23 L32 23 Z"
        fill="#FFFFFF"
      />
    </>
  ),
});
