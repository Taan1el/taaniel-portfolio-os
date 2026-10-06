import { createAppIcon } from "../app-icon";

/**
 * Games - the arcade hub. An indigo gamepad with two grips, a white d-pad and
 * a magenta/cyan button pair, so the hub reads as a console rather than as any
 * single cartridge in it.
 */
export const GamesIcon = createAppIcon("GamesIcon", {
  full: (
    <>
      <path
        d="M16 13H32C38.6 13 44 18.8 44 25.8C44 31 42.1 36.4 39.2 38.5C37 40 34.5 39.1 33.1 37.1L30.5 33.5C29.9 32.7 29 32.2 28 32.2H20C19 32.2 18.1 32.7 17.5 33.5L14.9 37.1C13.5 39.1 11 40 8.8 38.5C5.9 36.4 4 31 4 25.8C4 18.8 9.4 13 16 13Z"
        fill="#4A3AD1"
      />
      <path
        d="M14.5 18.5H18.5V22H22V26H18.5V29.5H14.5V26H11V22H14.5V18.5Z"
        fill="#FFFFFF"
      />
      <circle cx="31.5" cy="21.5" r="3.2" fill="#FF4D8D" />
      <circle cx="36.5" cy="27" r="3.2" fill="#37D6E0" />
    </>
  ),
  micro: (
    <>
      <path
        d="M16 13H32C38.6 13 44 18.8 44 25.8C44 31 42.1 36.4 39.2 38.5C37 40 34.5 39.1 33.1 37.1L30.5 33.5C29.9 32.7 29 32.2 28 32.2H20C19 32.2 18.1 32.7 17.5 33.5L14.9 37.1C13.5 39.1 11 40 8.8 38.5C5.9 36.4 4 31 4 25.8C4 18.8 9.4 13 16 13Z"
        fill="#4A3AD1"
      />
      <path
        d="M13.8 17.5H18.8V21.5H23V26.5H18.8V30.5H13.8V26.5H9.6V21.5H13.8V17.5Z"
        fill="#FFFFFF"
      />
      <circle cx="33.5" cy="23.5" r="4.4" fill="#FF4D8D" />
    </>
  ),
});
