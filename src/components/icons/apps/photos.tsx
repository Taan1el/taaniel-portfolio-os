import { createAppIcon } from "../app-icon";

/**
 * Photos - a rounded blue picture frame around a warm sun and a teal mountain
 * range. Windows Photos in spirit: flat frame, flat sky, flat peaks.
 */
export const PhotosIcon = createAppIcon("PhotosIcon", {
  full: (
    <>
      <defs>
        <clipPath id="PhotosIconInner">
          <rect x="8.5" y="10.5" width="31" height="27" rx="3" />
        </clipPath>
      </defs>
      <rect x="4" y="6" width="40" height="36" rx="5.5" fill="#1667C9" />
      <rect x="8.5" y="10.5" width="31" height="27" rx="3" fill="#CDE9FF" />
      <g clipPath="url(#PhotosIconInner)">
        <circle cx="15" cy="17.5" r="4" fill="#FFB020" />
        <path d="M4 40L19 21L34 40Z" fill="#4FC3A1" />
        <path d="M18 40L30 25.5L42 40Z" fill="#1F8F75" />
      </g>
    </>
  ),
  micro: (
    <>
      <defs>
        <clipPath id="PhotosIconMicroInner">
          <rect x="8.5" y="10.5" width="31" height="27" rx="3" />
        </clipPath>
      </defs>
      <rect x="4" y="6" width="40" height="36" rx="5.5" fill="#1667C9" />
      <rect x="8.5" y="10.5" width="31" height="27" rx="3" fill="#CDE9FF" />
      <g clipPath="url(#PhotosIconMicroInner)">
        <circle cx="15.5" cy="17" r="4.6" fill="#FFB020" />
        <path d="M5 40L22 19.5L41 40Z" fill="#1F8F75" />
      </g>
    </>
  ),
});
