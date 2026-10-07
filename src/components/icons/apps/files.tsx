import { createAppIcon } from "../app-icon";

/**
 * File Explorer - the Windows two-tone folder seen straight on.
 *
 * A blue-grey back plate with the raised left tab, a manila front face, and a
 * lighter tan lip along the top of the front face. Flat fills only.
 */
export const FilesIcon = createAppIcon("FilesIcon", {
  full: (
    <>
      {/* blue-grey back plate with the tab */}
      <path
        d="M7 8H18.4L22.4 12.4H41A3.6 3.6 0 0 1 44.6 16V36.4A3.6 3.6 0 0 1 41 40H7A3.6 3.6 0 0 1 3.4 36.4V11.6A3.6 3.6 0 0 1 7 8Z"
        fill="#4E739B"
      />
      {/* manila front face */}
      <path
        d="M3.4 20.4H44.6V36.4A3.6 3.6 0 0 1 41 40H7A3.6 3.6 0 0 1 3.4 36.4Z"
        fill="#EDB94F"
      />
      {/* lighter lip across the top of the front face */}
      <path
        d="M7 16.4H41A3.6 3.6 0 0 1 44.6 20V20.4H3.4V20A3.6 3.6 0 0 1 7 16.4Z"
        fill="#F8D27E"
      />
    </>
  ),
  micro: (
    <>
      <path
        d="M7 8H18.4L22.4 12.4H41A3.6 3.6 0 0 1 44.6 16V36.4A3.6 3.6 0 0 1 41 40H7A3.6 3.6 0 0 1 3.4 36.4V11.6A3.6 3.6 0 0 1 7 8Z"
        fill="#4E739B"
      />
      <path
        d="M3.4 18.6H44.6V36.4A3.6 3.6 0 0 1 41 40H7A3.6 3.6 0 0 1 3.4 36.4Z"
        fill="#EDB94F"
      />
    </>
  ),
});
