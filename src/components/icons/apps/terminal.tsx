import { createAppIcon } from "../app-icon";

/**
 * Terminal - a near-black console window with a chrome bar, a white chevron
 * prompt and a short underscore cursor. Inspired by Windows Terminal.
 */
export const TerminalIcon = createAppIcon("TerminalIcon", {
  full: (
    <>
      {/* console body */}
      <path
        d="M8 6H40A4 4 0 0 1 44 10V38A4 4 0 0 1 40 42H8A4 4 0 0 1 4 38V10A4 4 0 0 1 8 6Z"
        fill="#1B1C22"
      />
      {/* top chrome bar */}
      <path
        d="M8 6H40A4 4 0 0 1 44 10V14.8H4V10A4 4 0 0 1 8 6Z"
        fill="#2E3038"
      />
      {/* active tab pill */}
      <rect x="8.4" y="8.8" width="11" height="3.6" rx="1.8" fill="#4CC2FF" />
      {/* chevron prompt */}
      <path
        d="M13.2 19.6L16.2 16.6L25.6 26L16.2 35.4L13.2 32.4L19.6 26Z"
        fill="#FFFFFF"
      />
      {/* underscore cursor */}
      <rect x="27.4" y="31.8" width="10.4" height="3.6" rx="1.8" fill="#FFFFFF" />
    </>
  ),
  micro: (
    <>
      <path
        d="M8 6H40A4 4 0 0 1 44 10V38A4 4 0 0 1 40 42H8A4 4 0 0 1 4 38V10A4 4 0 0 1 8 6Z"
        fill="#1B1C22"
      />
      <path
        d="M13.4 15.6L17.4 11.6L31.8 26L17.4 40.4L13.4 36.4L23.8 26Z"
        fill="#FFFFFF"
      />
    </>
  ),
});
