import { createAppIcon } from "../app-icon";

/** Checkers - a red and a cream piece on a dark board. */
export const CheckersIcon = createAppIcon("CheckersIcon", {
  full: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="7" fill="#3B2A22" />
      <path d="M24 4H37A7 7 0 0 1 44 11V24H24ZM4 24H24V44H11A7 7 0 0 1 4 37Z" fill="#6B4A36" />
      <circle cx="17" cy="31" r="10" fill="#B91C1C" />
      <circle cx="17" cy="30" r="10" fill="#EF4444" />
      <circle cx="17" cy="30" r="6.5" fill="none" stroke="#FCA5A5" strokeWidth="1.6" />
      <circle cx="31" cy="18" r="10" fill="#C9B79A" />
      <circle cx="31" cy="17" r="10" fill="#F5EBDD" />
      <circle cx="31" cy="17" r="6.5" fill="none" stroke="#C9B79A" strokeWidth="1.6" />
    </>
  ),
  micro: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="7" fill="#3B2A22" />
      <circle cx="17" cy="30" r="11" fill="#EF4444" />
      <circle cx="31" cy="17" r="11" fill="#F5EBDD" />
    </>
  ),
});
