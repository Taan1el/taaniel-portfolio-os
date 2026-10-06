import { createAppIcon } from "../app-icon";

/**
 * Notes - Windows Notepad flavour: a white sheet with a saturated blue header
 * band and grey text rules. The band is what separates it from Resume at a
 * glance; Resume answers with an avatar and a slate frame instead.
 */
export const NotesIcon = createAppIcon("NotesIcon", {
  full: (
    <>
      <rect x="7" y="4" width="34" height="40" rx="4.5" fill="#B9C8DB" />
      <rect x="9" y="6" width="30" height="36" rx="3" fill="#FFFFFF" />
      <path d="M9 9a3 3 0 0 1 3-3h24a3 3 0 0 1 3 3v7H9Z" fill="#1668C1" />
      <rect x="14" y="22" width="20" height="2.6" rx="1.3" fill="#93A3B8" />
      <rect x="14" y="28" width="20" height="2.6" rx="1.3" fill="#93A3B8" />
      <rect x="14" y="34" width="12" height="2.6" rx="1.3" fill="#93A3B8" />
    </>
  ),
  micro: (
    <>
      <rect x="7" y="4" width="34" height="40" rx="4.5" fill="#B9C8DB" />
      <rect x="9" y="6" width="30" height="36" rx="3" fill="#FFFFFF" />
      <path d="M9 9a3 3 0 0 1 3-3h24a3 3 0 0 1 3 3v10H9Z" fill="#1668C1" />
      <rect x="14" y="25" width="20" height="4" rx="2" fill="#8C9DB4" />
      <rect x="14" y="33" width="13" height="4" rx="2" fill="#8C9DB4" />
    </>
  ),
});
