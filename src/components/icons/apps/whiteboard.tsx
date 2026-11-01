import { createAppIcon } from "../app-icon";

/** Whiteboard - a white board with a marker squiggle. */
export const WhiteboardIcon = createAppIcon("WhiteboardIcon", {
  full: (
    <>
      <rect x="4" y="7" width="40" height="30" rx="4" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" />
      <path d="M11 27C14 17 18 16 20 21S24 30 28 22 33 17 37 19" fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 37L14 44M30 37L34 44" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  micro: (
    <>
      <rect x="4" y="7" width="40" height="32" rx="4" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="3" />
      <path d="M11 28C15 15 20 15 22 22S27 31 37 18" fill="none" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
});
