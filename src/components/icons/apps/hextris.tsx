import { createAppIcon } from "../app-icon";

/**
 * Hextris - a slate centre hexagon ringed by six coloured block segments,
 * one per side, split by thin spokes. Light tile, after the game's own board.
 *
 * Palette: tile #EEF2F5, core #34495E, red #E74C3C, yellow #F1C40F,
 * blue #3498DB, green #2ECC71.
 *
 * Geometry: flat-sided hexagons centred on (24, 24); outer ring radius 17,
 * inner ring radius 11.5, core radius 9. Segment boundaries sit on the
 * vertex rays (0, 60, 120 ... degrees), which is where the spokes are drawn.
 */
const SPOKE_ANGLES = [0, 60, 120, 180, 240, 300];

export const HextrisIcon = createAppIcon("HextrisIcon", {
  full: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="9" fill="#EEF2F5" />

      {/* outer ring, one segment per side */}
      <path d="M41 24L32.5 38.72L29.75 33.96L35.5 24Z" fill="#E74C3C" />
      <path d="M32.5 38.72L15.5 38.72L18.25 33.96L29.75 33.96Z" fill="#F1C40F" />
      <path d="M15.5 38.72L7 24L12.5 24L18.25 33.96Z" fill="#3498DB" />
      <path d="M7 24L15.5 9.28L18.25 14.04L12.5 24Z" fill="#2ECC71" />
      <path d="M15.5 9.28L32.5 9.28L29.75 14.04L18.25 14.04Z" fill="#F1C40F" />
      <path d="M32.5 9.28L41 24L35.5 24L29.75 14.04Z" fill="#3498DB" />

      {/* spokes separating the segments */}
      {SPOKE_ANGLES.map((angle) => (
        <rect
          key={angle}
          x="34.6"
          y="23.35"
          width="7.6"
          height="1.3"
          fill="#EEF2F5"
          transform={`rotate(${angle} 24 24)`}
        />
      ))}

      {/* core */}
      <path d="M33 24L28.5 31.79L19.5 31.79L15 24L19.5 16.21L28.5 16.21Z" fill="#34495E" />
    </>
  ),
  micro: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="9" fill="#EEF2F5" />
      <path d="M41 24L32.5 38.72L15.5 38.72L18.25 33.96L29.75 33.96L35.5 24Z" fill="#E74C3C" />
      <path d="M15.5 38.72L7 24L15.5 9.28L18.25 14.04L12.5 24L18.25 33.96Z" fill="#F1C40F" />
      <path d="M15.5 9.28L32.5 9.28L41 24L35.5 24L29.75 14.04L18.25 14.04Z" fill="#3498DB" />
      <path d="M33 24L28.5 31.79L19.5 31.79L15 24L19.5 16.21L28.5 16.21Z" fill="#34495E" />
    </>
  ),
});
