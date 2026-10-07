import { createAppIcon } from "../app-icon";

/**
 * Projects - a portfolio case.
 *
 * Warm amber body, a darker handle arching out of the top edge, and a lighter
 * clasp band running the full width with a matching latch at centre.
 */
export const ProjectsIcon = createAppIcon("ProjectsIcon", {
  full: (
    <>
      {/* Handle: outer arch with the grip cut out (evenodd, no stroke) */}
      <path
        fillRule="evenodd"
        d="M21 6 H27 A4 4 0 0 1 31 10 V18 H17 V10 A4 4 0 0 1 21 6 Z M22.5 10.5 H25.5 A1.5 1.5 0 0 1 27 12 V18 H21 V12 A1.5 1.5 0 0 1 22.5 10.5 Z"
        fill="#8A5520"
      />
      {/* Case body */}
      <rect x="5" y="15" width="38" height="25" rx="4" fill="#E2921F" />
      {/* Clasp band */}
      <rect x="5" y="23" width="38" height="6" fill="#FFC768" />
      {/* Latch */}
      <rect x="21" y="21" width="6" height="10" rx="1.5" fill="#8A5520" />
    </>
  ),
  micro: (
    <>
      <path
        fillRule="evenodd"
        d="M20.5 5 H27.5 A4.5 4.5 0 0 1 32 9.5 V18 H16 V9.5 A4.5 4.5 0 0 1 20.5 5 Z M22.5 9.5 H25.5 A1.5 1.5 0 0 1 27 11 V18 H21 V11 A1.5 1.5 0 0 1 22.5 9.5 Z"
        fill="#8A5520"
      />
      <rect x="4" y="15" width="40" height="26" rx="4" fill="#E2921F" />
      <rect x="4" y="24" width="40" height="7" fill="#FFC768" />
    </>
  ),
});
