import { createAppIcon } from "../app-icon";

/**
 * Resume - a CV sheet: slate frame, white page, an avatar head and shoulders at
 * the top left with short rules beside and below. Deliberately cool and neutral
 * so it never reads as Notes (blue band) or PDF (red).
 */
export const ResumeIcon = createAppIcon("ResumeIcon", {
  full: (
    <>
      <rect x="8" y="4" width="32" height="40" rx="4.5" fill="#334155" />
      <rect x="10" y="6" width="28" height="36" rx="3" fill="#FFFFFF" />
      <circle cx="17.5" cy="14.6" r="3.8" fill="#4C5C75" />
      <path d="M12.9 23.6a4.6 4.6 0 0 1 9.2 0Z" fill="#4C5C75" />
      <rect x="25" y="12.5" width="10.5" height="2.4" rx="1.2" fill="#4C5C75" />
      <rect x="25" y="17.5" width="7.5" height="2.2" rx="1.1" fill="#AEBACB" />
      <rect x="14" y="28" width="20" height="2.4" rx="1.2" fill="#AEBACB" />
      <rect x="14" y="33" width="20" height="2.4" rx="1.2" fill="#AEBACB" />
      <rect x="14" y="38" width="12" height="2.4" rx="1.2" fill="#AEBACB" />
    </>
  ),
  micro: (
    <>
      <rect x="8" y="4" width="32" height="40" rx="4.5" fill="#334155" />
      <rect x="10" y="6" width="28" height="36" rx="3" fill="#FFFFFF" />
      <circle cx="24" cy="16" r="5" fill="#4C5C75" />
      <path d="M17.5 28a6.5 6.5 0 0 1 13 0Z" fill="#4C5C75" />
      <rect x="15" y="32" width="18" height="3.4" rx="1.7" fill="#AEBACB" />
      <rect x="15" y="37.5" width="12" height="3.4" rx="1.7" fill="#AEBACB" />
    </>
  ),
});
