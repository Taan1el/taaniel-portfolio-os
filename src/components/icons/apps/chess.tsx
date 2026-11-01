import { createAppIcon } from "../app-icon";

/** Chess - a knight on a board of two browns. */
export const ChessIcon = createAppIcon("ChessIcon", {
  full: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="7" fill="#7A5A44" />
      <path d="M24 4H37A7 7 0 0 1 44 11V24H24ZM4 24H24V44H11A7 7 0 0 1 4 37Z" fill="#E7D6BF" />
      <path d="M14 39C14 34 18 32 21 28C19 28 16 29 14 30L11 26C14 19 19 11 24 9L26 12C32 13 36 21 35 39Z" fill="#1F2733" />
      <circle cx="21" cy="16" r="1.6" fill="#E7D6BF" />
    </>
  ),
  micro: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="7" fill="#E7D6BF" />
      <path d="M13 41C13 35 18 33 21 28C18 28 15 30 13 31L9 26C13 18 18 9 24 7L27 11C34 12 38 21 37 41Z" fill="#1F2733" />
    </>
  ),
});
