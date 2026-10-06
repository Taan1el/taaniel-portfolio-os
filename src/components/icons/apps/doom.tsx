import { createAppIcon } from "../app-icon";

/**
 * Doom - a horned demon skull in bone white on a near-black blood tile,
 * with angled red eye sockets and a clenched jaw. Flat fills only.
 *
 * Palette: tile #1A0B0B, horns #8B1E1E, skull #E8DCC8, eyes #DC2626,
 * shadow #3A1414.
 */
export const DoomIcon = createAppIcon("DoomIcon", {
  full: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="9" fill="#1A0B0B" />

      {/* horns */}
      <path d="M15.2 19.5C12.4 16.6 10.6 12.6 10.4 7.8C13.8 10.2 17.2 12.6 19.6 15.4Z" fill="#8B1E1E" />
      <path d="M32.8 19.5C35.6 16.6 37.4 12.6 37.6 7.8C34.2 10.2 30.8 12.6 28.4 15.4Z" fill="#8B1E1E" />

      {/* skull */}
      <path
        d="M24 12.6C30.9 12.6 35.2 17.4 35.2 23.8V27.6C35.2 30.6 33.6 32.6 31.4 33.6V38.4C31.4 39.4 30.6 40.2 29.6 40.2H18.4C17.4 40.2 16.6 39.4 16.6 38.4V33.6C14.4 32.6 12.8 30.6 12.8 27.6V23.8C12.8 17.4 17.1 12.6 24 12.6Z"
        fill="#E8DCC8"
      />

      {/* angled eye sockets */}
      <path d="M15.8 22.6L22.2 24.8L21.4 29.4L17 28.4C16.1 27.2 15.7 25 15.8 22.6Z" fill="#DC2626" />
      <path d="M32.2 22.6L25.8 24.8L26.6 29.4L31 28.4C31.9 27.2 32.3 25 32.2 22.6Z" fill="#DC2626" />

      {/* nose */}
      <path d="M24 29.6L22.4 32.6H25.6Z" fill="#3A1414" />

      {/* jaw line and teeth gaps */}
      <rect x="18.4" y="34.4" width="11.2" height="1.3" rx="0.6" fill="#3A1414" />
      <rect x="20.9" y="34.4" width="1.1" height="5.8" fill="#3A1414" />
      <rect x="23.45" y="34.4" width="1.1" height="5.8" fill="#3A1414" />
      <rect x="26" y="34.4" width="1.1" height="5.8" fill="#3A1414" />
    </>
  ),
  micro: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="9" fill="#1A0B0B" />
      <path d="M14.6 20C11.8 16.8 10.2 12.6 10 7.4C14 10 17.8 12.8 20.2 15.8Z" fill="#8B1E1E" />
      <path d="M33.4 20C36.2 16.8 37.8 12.6 38 7.4C34 10 30.2 12.8 27.8 15.8Z" fill="#8B1E1E" />
      <path
        d="M24 12.6C30.9 12.6 35.2 17.4 35.2 23.8V28C35.2 30.8 33.6 32.8 31.4 33.8V40.2H16.6V33.8C14.4 32.8 12.8 30.8 12.8 28V23.8C12.8 17.4 17.1 12.6 24 12.6Z"
        fill="#E8DCC8"
      />
      <path d="M15.6 22.2L22.6 24.6L21.6 30L16.6 28.8Z" fill="#DC2626" />
      <path d="M32.4 22.2L25.4 24.6L26.4 30L31.4 28.8Z" fill="#DC2626" />
    </>
  ),
});
