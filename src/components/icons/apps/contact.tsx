import { createAppIcon } from "../app-icon";

/**
 * Contact - an envelope whose flap folds down into a bold "M" valley.
 *
 * Gmail-inspired: red body, darker red flap triangle, white interior notched by
 * the V of the fold. Redrawn on our own 48-grid proportions, no traced curves.
 */
export const ContactIcon = createAppIcon("ContactIcon", {
  full: (
    <>
      {/* Envelope body */}
      <rect x="6" y="12" width="36" height="24" rx="3" fill="#EA4335" />
      {/* Folded flap, corners following the body radius */}
      <path
        d="M6 15 A3 3 0 0 1 9 12 L39 12 A3 3 0 0 1 42 15 L24 25 Z"
        fill="#C5221F"
      />
      {/* White paper, notched by the V of the fold */}
      <path d="M11 21.5 L24 31 L37 21.5 L37 36 L11 36 Z" fill="#FFFFFF" />
    </>
  ),
  micro: (
    <>
      <rect x="5" y="11" width="38" height="26" rx="3" fill="#EA4335" />
      <path d="M12 19 L24 31 L36 19 L36 37 L12 37 Z" fill="#FFFFFF" />
    </>
  ),
});
