import { createAppIcon } from "../app-icon";

/**
 * Generic document. White page, folded top-right corner, three grey text rules.
 * The page edge is a slightly larger grey shape sitting behind the white one -
 * a border without a stroke.
 */
export const FileIcon = createAppIcon("FileIcon", {
  full: (
    <>
      {/* page edge */}
      <path
        d="M12 4h16.4a2 2 0 0 1 1.41.59l8.6 8.6A2 2 0 0 1 39 14.6V40a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z"
        fill="#C2CDDB"
      />
      {/* page face */}
      <path
        d="M12.8 5.6h15.4v9.6a1.6 1.6 0 0 0 1.6 1.6h7.6V40a2.4 2.4 0 0 1-2.4 2.4H12.8A2.4 2.4 0 0 1 10.4 40V8a2.4 2.4 0 0 1 2.4-2.4Z"
        fill="#FFFFFF"
      />
      {/* folded corner */}
      <path d="M29.8 5.9 37.1 13.2a1 1 0 0 1-.71 1.71H30.5a.7.7 0 0 1-.7-.7V5.9Z" fill="#96A7BC" />
      {/* text rules */}
      <path d="M15.4 22.4h17.2a1.2 1.2 0 0 1 0 2.4H15.4a1.2 1.2 0 0 1 0-2.4Z" fill="#A9B6C6" />
      <path d="M15.4 28.4h17.2a1.2 1.2 0 0 1 0 2.4H15.4a1.2 1.2 0 0 1 0-2.4Z" fill="#A9B6C6" />
      <path d="M15.4 34.4h10.6a1.2 1.2 0 0 1 0 2.4H15.4a1.2 1.2 0 0 1 0-2.4Z" fill="#A9B6C6" />
    </>
  ),
  micro: (
    <>
      <path
        d="M11 3h17.2a2 2 0 0 1 1.41.59l10.8 10.8A2 2 0 0 1 41 15.8V41a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z"
        fill="#B7C4D4"
      />
      <path
        d="M11.6 5.2h16.6v10.4a2.2 2.2 0 0 0 2.2 2.2h8.4V41a2.2 2.2 0 0 1-2.2 2.2H11.6A2.2 2.2 0 0 1 9.4 41V7.4a2.2 2.2 0 0 1 2.2-2.2Z"
        fill="#FFFFFF"
      />
      <path d="M29.6 5.4 40 15.8a.9.9 0 0 1-.64 1.54h-8.5a1.26 1.26 0 0 1-1.26-1.26V5.4Z" fill="#8B9DB4" />
      <path d="M14.6 23h19.4a1.8 1.8 0 0 1 0 3.6H14.6a1.8 1.8 0 0 1 0-3.6Z" fill="#9AA9BB" />
      <path d="M14.6 31h12.6a1.8 1.8 0 0 1 0 3.6H14.6a1.8 1.8 0 0 1 0-3.6Z" fill="#9AA9BB" />
    </>
  ),
});
