import { createAppIcon } from "../app-icon";

/**
 * Generic shell folder. Windows 11 language: flat two-tone manila front over a
 * blue-grey back tab. No gradients, no strokes - every shape is a closed path
 * with an explicit solid fill.
 */
export const FolderIcon = createAppIcon("FolderIcon", {
  full: (
    <>
      {/* blue-grey back plate with the tab */}
      <path
        d="M7 9h10.6a3 3 0 0 1 2.12.88L22.5 13H41a3 3 0 0 1 3 3v21a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3Z"
        fill="#5B7FA6"
      />
      {/* darker seam under the front lip so the two halves separate at 16px */}
      <path d="M4 16h40v3H4Z" fill="#4A6C91" />
      {/* manila front, upper band */}
      <path d="M7 16h34a3 3 0 0 1 3 3v4H4v-4a3 3 0 0 1 3-3Z" fill="#FFCE63" />
      {/* manila front, body */}
      <path d="M4 22h40v15a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V22Z" fill="#F0AE34" />
    </>
  ),
  micro: (
    <>
      <path
        d="M6 8h11.6a4 4 0 0 1 2.83 1.17L23 12h19a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z"
        fill="#5B7FA6"
      />
      <path d="M2 17h44v21a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V17Z" fill="#F0AE34" />
    </>
  ),
});
