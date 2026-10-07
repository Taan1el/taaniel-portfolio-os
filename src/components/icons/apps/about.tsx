import { createAppIcon } from "../app-icon";

/**
 * About - an identity card: teal card, a pale portrait plate holding head and
 * shoulders, and three detail rules standing in for the name and title lines.
 */
export const AboutIcon = createAppIcon("AboutIcon", {
  full: (
    <>
      <rect x="4" y="8" width="40" height="32" rx="5" fill="#0E7490" />
      <rect x="8" y="12" width="16" height="24" rx="3" fill="#ECFAFE" />
      <circle cx="16" cy="20.5" r="4.3" fill="#0891B2" />
      <path d="M10.6 32a5.4 5.4 0 0 1 10.8 0Z" fill="#0891B2" />
      <rect x="28" y="14.5" width="12" height="2.8" rx="1.4" fill="#FFFFFF" />
      <rect x="28" y="20.5" width="12" height="2.4" rx="1.2" fill="#7FD4E8" />
      <rect x="28" y="25.5" width="8.5" height="2.4" rx="1.2" fill="#7FD4E8" />
    </>
  ),
  micro: (
    <>
      <rect x="4" y="8" width="40" height="32" rx="5" fill="#0E7490" />
      <circle cx="24" cy="20" r="5" fill="#ECFAFE" />
      <path d="M16.5 33a7.5 7.5 0 0 1 15 0Z" fill="#ECFAFE" />
    </>
  ),
});
