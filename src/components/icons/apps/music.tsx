import { createAppIcon } from "../app-icon";

/**
 * Music - a teal media tile carrying a beamed pair of eighth notes with violet
 * note heads. Squircle tile, flat fills, no player chrome.
 */
export const MusicIcon = createAppIcon("MusicIcon", {
  full: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="10" fill="#0F9B92" />
      <path d="M18 12.6L34 9.4L34 14.6L18 17.8Z" fill="#FFFFFF" />
      <rect x="18" y="12.6" width="3.2" height="16.9" fill="#FFFFFF" />
      <rect x="30.8" y="10" width="3.2" height="17.5" fill="#FFFFFF" />
      <ellipse cx="16.2" cy="30.6" rx="5.2" ry="4.2" fill="#A76BF6" />
      <ellipse cx="29" cy="28.6" rx="5.2" ry="4.2" fill="#A76BF6" />
    </>
  ),
  micro: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="10" fill="#0F9B92" />
      <path d="M29.6 11L37 8.2L37 15.6L29.6 18.4Z" fill="#FFFFFF" />
      <rect x="26" y="11" width="3.8" height="19" fill="#FFFFFF" />
      <ellipse cx="22.6" cy="31" rx="6" ry="4.8" fill="#A76BF6" />
    </>
  ),
});
