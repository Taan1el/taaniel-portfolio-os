import { createAppIcon } from "../app-icon";

/**
 * Paint - an artist palette with a cut-out thumb hole, four paint blobs and a
 * brush laid across it. The thumb hole is an evenodd subpath, not a mask, so it
 * stays transparent over any wallpaper.
 */
export const PaintIcon = createAppIcon("PaintIcon", {
  full: (
    <>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M24 7C34.5 7 42 13.5 42 22C42 28 38 30.5 34.5 31C31.5 31.4 30 32.5 30 34.5C30 37 32 38 32 39.5C32 41 30.5 42 27.5 42C15 42 6 34.5 6 24.5C6 14 14 7 24 7ZM21.5 30C21.5 27.5147 19.4853 25.5 17 25.5C14.5147 25.5 12.5 27.5147 12.5 30C12.5 32.4853 14.5147 34.5 17 34.5C19.4853 34.5 21.5 32.4853 21.5 30Z"
        fill="#F0DCBE"
      />
      <circle cx="16.5" cy="15.8" r="3.6" fill="#E4453A" />
      <circle cx="25.8" cy="12.6" r="3.6" fill="#FFC02E" />
      <circle cx="33.6" cy="17.6" r="3.6" fill="#3BB273" />
      <circle cx="34.6" cy="26" r="3.2" fill="#2F7DE1" />
      <path d="M25.46 41.46L28.69 36.21L31.79 39.31L26.54 42.54Z" fill="#E4453A" />
      <path d="M28.69 36.21L30.81 34.09L33.91 37.19L31.79 39.31Z" fill="#A7B0BE" />
      <path d="M30.81 34.09L40.01 24.89L43.11 27.99L33.91 37.19Z" fill="#8B5E34" />
    </>
  ),
  micro: (
    <>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M24 6C35 6 43 13 43 22C43 28.4 38.7 31 35 31.5C31.8 31.9 30.2 33.1 30.2 35.2C30.2 37.8 32.3 38.9 32.3 40.4C32.3 42 30.7 43 27.5 43C14.4 43 5 35 5 24.5C5 13.4 13.4 6 24 6ZM21.8 30C21.8 27.2386 19.5614 25 16.8 25C14.0386 25 11.8 27.2386 11.8 30C11.8 32.7614 14.0386 35 16.8 35C19.5614 35 21.8 32.7614 21.8 30Z"
        fill="#F0DCBE"
      />
      <circle cx="18" cy="15.5" r="4.6" fill="#E4453A" />
      <circle cx="30.5" cy="14.5" r="4.6" fill="#FFC02E" />
      <circle cx="35.5" cy="24.5" r="4.2" fill="#2F7DE1" />
    </>
  ),
});
