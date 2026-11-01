import { createAppIcon } from "../app-icon";

/** Solitaire - two overlapping playing cards. */
export const SolitaireIcon = createAppIcon("SolitaireIcon", {
  full: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="7" fill="#1F5F46" />
      <rect x="9" y="11" width="20" height="28" rx="3" fill="#E8E2D4" transform="rotate(-8 19 25)" />
      <rect x="19" y="9" width="20" height="28" rx="3" fill="#FFFFFF" transform="rotate(6 29 23)" />
      <path d="M29 15C31 18 35 20 35 23.5A3.4 3.4 0 0 1 29.6 26.3L30.6 30H27.4L28.4 26.3A3.4 3.4 0 0 1 23 23.5C23 20 27 18 29 15Z" fill="#1C2330" />
    </>
  ),
  micro: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="7" fill="#1F5F46" />
      <rect x="13" y="9" width="23" height="31" rx="3" fill="#FFFFFF" />
      <path d="M24.5 15C27 19 31 21 31 25A3.8 3.8 0 0 1 25.2 28L26.5 33H22.5L23.8 28A3.8 3.8 0 0 1 18 25C18 21 22 19 24.5 15Z" fill="#1C2330" />
    </>
  ),
});
