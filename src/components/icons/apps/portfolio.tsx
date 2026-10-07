import { createAppIcon } from "../app-icon";

/**
 * Portfolio - the TV monogram (see components/ui/logo-mark.tsx) reversed out
 * of a blue tile. Used for the shortcut to the quick portfolio page, so it
 * never reads as the Browser app.
 *
 * Palette: tile #0F6CBD, mark #FFFFFF.
 */
const Mark = ({ strokeWidth }: { strokeWidth: number }) => (
  <g transform="translate(14 12.6) scale(0.1)" stroke="#FFFFFF" strokeWidth={strokeWidth} strokeLinecap="round">
    <line x1="28" y1="14" x2="93" y2="173" />
    <line x1="100" y1="14" x2="100" y2="173" />
    <line x1="172" y1="14" x2="107" y2="173" />
    <line x1="12" y1="210" x2="188" y2="210" />
  </g>
);

export const PortfolioIcon = createAppIcon("PortfolioIcon", {
  full: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="9" fill="#0F6CBD" />
      <Mark strokeWidth={30} />
    </>
  ),
  micro: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="9" fill="#0F6CBD" />
      <Mark strokeWidth={40} />
    </>
  ),
});
