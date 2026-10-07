import { createAppIcon } from "../app-icon";

/**
 * Browser - a four-part colour pinwheel around a blue core.
 *
 * Chrome-inspired geometry (three outer wedges, white ring, blue disc) redrawn
 * with our own wedge boundaries and a flatter Windows 11 palette.
 */
export const BrowserIcon = createAppIcon("BrowserIcon", {
  full: (
    <>
      {/* Upper-right wedge, seam at 12 o'clock */}
      <path d="M24 24 L24 4 A20 20 0 0 1 41.3 34 Z" fill="#E8453C" />
      {/* Bottom wedge */}
      <path d="M24 24 L41.3 34 A20 20 0 0 1 6.7 34 Z" fill="#F5B400" />
      {/* Upper-left wedge */}
      <path d="M24 24 L6.7 34 A20 20 0 0 1 24 4 Z" fill="#1FA463" />
      <circle cx="24" cy="24" r="10" fill="#FFFFFF" />
      <circle cx="24" cy="24" r="7.5" fill="#1A73E8" />
    </>
  ),
  micro: (
    <>
      <path d="M24 24 L24 3 A21 21 0 0 1 42.2 34.5 Z" fill="#E8453C" />
      <path d="M24 24 L42.2 34.5 A21 21 0 0 1 5.8 34.5 Z" fill="#F5B400" />
      <path d="M24 24 L5.8 34.5 A21 21 0 0 1 24 3 Z" fill="#1FA463" />
      <circle cx="24" cy="24" r="11.5" fill="#FFFFFF" />
      <circle cx="24" cy="24" r="8" fill="#1A73E8" />
    </>
  ),
});
