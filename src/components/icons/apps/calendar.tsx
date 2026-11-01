import { createAppIcon } from "../app-icon";

/** Calendar - a page with a coloured header. */
export const CalendarIcon = createAppIcon("CalendarIcon", {
  full: (
    <>
      <rect x="6" y="9" width="36" height="33" rx="5" fill="#F8FAFC" />
      <path d="M6 14A5 5 0 0 1 11 9H37A5 5 0 0 1 42 14V19H6Z" fill="#2563EB" />
      <rect x="14" y="5" width="4" height="9" rx="2" fill="#1E3A8A" />
      <rect x="30" y="5" width="4" height="9" rx="2" fill="#1E3A8A" />
      <path d="M14 24H18M22 24H26M30 24H34M14 30H18M22 30H26M30 30H34M14 36H18M22 36H26" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  micro: (
    <>
      <rect x="5" y="7" width="38" height="36" rx="5" fill="#F8FAFC" />
      <path d="M5 12A5 5 0 0 1 10 7H38A5 5 0 0 1 43 12V19H5Z" fill="#2563EB" />
      <rect x="13" y="25" width="8" height="8" fill="#2563EB" />
      <rect x="27" y="25" width="8" height="8" fill="#94A3B8" />
    </>
  ),
});
