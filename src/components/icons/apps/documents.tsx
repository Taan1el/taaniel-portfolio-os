import { createAppIcon } from "../app-icon";

/** Documents - a page of text with a blue corner. */
export const DocumentsIcon = createAppIcon("DocumentsIcon", {
  full: (
    <>
      <path d="M11 4H29L39 14V40A4 4 0 0 1 35 44H11A4 4 0 0 1 7 40V8A4 4 0 0 1 11 4Z" fill="#F8FAFC" />
      <path d="M29 4L39 14H31A2 2 0 0 1 29 12Z" fill="#93C5FD" />
      <rect x="7" y="19" width="32" height="9" fill="#2563EB" />
      <path d="M13 23.5H33M13 33H33M13 38H26" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M13 23.5H33" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  micro: (
    <>
      <path d="M10 4H30L40 14V40A4 4 0 0 1 36 44H12A4 4 0 0 1 8 40V6A2 2 0 0 1 10 4Z" fill="#F8FAFC" />
      <rect x="8" y="19" width="32" height="10" fill="#2563EB" />
      <path d="M14 36H34" stroke="#94A3B8" strokeWidth="3.5" strokeLinecap="round" />
    </>
  ),
});
