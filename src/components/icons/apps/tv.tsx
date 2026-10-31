import { createAppIcon } from "../app-icon";

/** TV & Radio - a small television with an antenna. */
export const TvIcon = createAppIcon("TvIcon", {
  full: (
    <>
      <path d="M17 6L24 13L31 6" fill="none" stroke="#9AA6BD" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="5" y="13" width="38" height="27" rx="5" fill="#2A3247" />
      <rect x="9" y="17" width="23" height="19" rx="3" fill="#3B82F6" />
      <path d="M9 31L17 24L23 29L27 26L32 31V33A3 3 0 0 1 29 36H12A3 3 0 0 1 9 33Z" fill="#93C5FD" />
      <circle cx="37.5" cy="21" r="2.5" fill="#FFC24B" />
      <circle cx="37.5" cy="29" r="2.5" fill="#9AA6BD" />
    </>
  ),
  micro: (
    <>
      <path d="M16 5L24 13L32 5" fill="none" stroke="#9AA6BD" strokeWidth="3" strokeLinecap="round" />
      <rect x="4" y="13" width="40" height="29" rx="5" fill="#2A3247" />
      <rect x="9" y="18" width="24" height="19" rx="3" fill="#3B82F6" />
      <circle cx="38" cy="24" r="3" fill="#FFC24B" />
    </>
  ),
});
