import { createAppIcon } from "../app-icon";

/**
 * Video - a film clapperboard: dark slate body, a hinged clap stick raised at
 * the right, angled white stripes across it, amber play mark on the board.
 */
export const VideoIcon = createAppIcon("VideoIcon", {
  full: (
    <>
      <defs>
        <clipPath id="VideoIconStick">
          <path d="M5 19L42.8 11.65L41.58 5.37L3.78 12.72Z" />
        </clipPath>
      </defs>
      <rect x="4.5" y="18.5" width="39" height="22.5" rx="3.5" fill="#323B4F" />
      <path d="M5 19L42.8 11.65L41.58 5.37L3.78 12.72Z" fill="#4C5770" />
      <g clipPath="url(#VideoIconStick)">
        <path d="M10 2L14.6 2L5.6 22L1 22Z" fill="#F4F6FA" />
        <path d="M18.5 2L23.1 2L14.1 22L9.5 22Z" fill="#F4F6FA" />
        <path d="M27 2L31.6 2L22.6 22L18 22Z" fill="#F4F6FA" />
        <path d="M35.5 2L40.1 2L31.1 22L26.5 22Z" fill="#F4F6FA" />
        <path d="M44 2L48.6 2L39.6 22L35 22Z" fill="#F4F6FA" />
      </g>
      <path d="M19.5 23.8L32.5 29.8L19.5 35.8Z" fill="#FFB020" />
    </>
  ),
  micro: (
    <>
      <defs>
        <clipPath id="VideoIconMicroStick">
          <path d="M5 19L42.8 11.65L41.58 5.37L3.78 12.72Z" />
        </clipPath>
      </defs>
      <rect x="4.5" y="18.5" width="39" height="22.5" rx="3.5" fill="#323B4F" />
      <path d="M5 19L42.8 11.65L41.58 5.37L3.78 12.72Z" fill="#4C5770" />
      <g clipPath="url(#VideoIconMicroStick)">
        <path d="M13 2L18.6 2L9.6 22L4 22Z" fill="#F4F6FA" />
        <path d="M27 2L32.6 2L23.6 22L18 22Z" fill="#F4F6FA" />
        <path d="M41 2L46.6 2L37.6 22L32 22Z" fill="#F4F6FA" />
      </g>
      <path d="M19 23.2L33 29.8L19 36.4Z" fill="#FFB020" />
    </>
  ),
});
