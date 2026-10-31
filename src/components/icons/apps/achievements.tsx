import { createAppIcon } from "../app-icon";

/** Achievements - a gold trophy on a dark tile. */
export const AchievementsIcon = createAppIcon("AchievementsIcon", {
  full: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="8" fill="#2A3247" />
      <path d="M15 12H33V22A9 9 0 0 1 15 22Z" fill="#FFC24B" />
      <path d="M15 14H10V18A6 6 0 0 0 16 24M33 14H38V18A6 6 0 0 1 32 24" fill="none" stroke="#FFC24B" strokeWidth="2.5" />
      <rect x="22" y="30" width="4" height="6" fill="#E0A030" />
      <rect x="16" y="36" width="16" height="4" rx="1.5" fill="#FFC24B" />
    </>
  ),
  micro: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="8" fill="#2A3247" />
      <path d="M14 11H34V22A10 10 0 0 1 14 22Z" fill="#FFC24B" />
      <rect x="21" y="31" width="6" height="6" fill="#FFC24B" />
      <rect x="15" y="36" width="18" height="5" rx="2" fill="#FFC24B" />
    </>
  ),
});
