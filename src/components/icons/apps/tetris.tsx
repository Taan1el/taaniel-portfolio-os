import { createAppIcon } from "../app-icon";

/**
 * Tetris - four tetrominoes interlocked into a perfect 4x4 well, each piece a
 * single solid colour with a 1.2u kerf between neighbours. Each piece is drawn
 * as overlapping rounded rects of one fill, so the union reads as one block.
 *
 * Palette: well #161A30, cyan I #22D3EE, yellow O #FACC15,
 * purple J #A855F7, red L #EF4444.
 */
export const TetrisIcon = createAppIcon("TetrisIcon", {
  full: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="9" fill="#161A30" />

      {/* J - left column dropping into a foot */}
      <rect x="7.6" y="7.6" width="7.3" height="24.3" rx="2.2" fill="#A855F7" />
      <rect x="7.6" y="24.6" width="15.8" height="7.3" rx="2.2" fill="#A855F7" />

      {/* O - the 2x2 square wedged between the columns */}
      <rect x="16.1" y="7.6" width="15.8" height="15.8" rx="2.8" fill="#FACC15" />

      {/* L - right column dropping into a mirrored foot */}
      <rect x="33.1" y="7.6" width="7.3" height="24.3" rx="2.2" fill="#EF4444" />
      <rect x="24.6" y="24.6" width="15.8" height="7.3" rx="2.2" fill="#EF4444" />

      {/* I - the flat line closing the well */}
      <rect x="7.6" y="33.1" width="32.8" height="7.3" rx="2.2" fill="#22D3EE" />
    </>
  ),
  micro: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="9" fill="#161A30" />
      <rect x="8.5" y="8.5" width="14.5" height="14.5" rx="3" fill="#22D3EE" />
      <rect x="25" y="8.5" width="14.5" height="14.5" rx="3" fill="#FACC15" />
      <rect x="8.5" y="25" width="14.5" height="14.5" rx="3" fill="#A855F7" />
      <rect x="25" y="25" width="14.5" height="14.5" rx="3" fill="#EF4444" />
    </>
  ),
});
