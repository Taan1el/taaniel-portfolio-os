import { createAppIcon } from "../app-icon";

/**
 * Recycle Bin, two states. Both are the same flat blue-grey cylinder: lid rim,
 * tapered body, three vertical ribs. Windows draws the bin as translucent glass;
 * here that reads as solid lighter tints, never opacity or a gradient.
 */

/** Lid rim shared by both states, drawn on top of whatever is in the bin. */
const LID = (
  <>
    <path
      d="M11.5 10h25a2.6 2.6 0 0 1 2.6 2.6v2.2a2.6 2.6 0 0 1-2.6 2.6h-25a2.6 2.6 0 0 1-2.6-2.6v-2.2A2.6 2.6 0 0 1 11.5 10Z"
      fill="#547FA8"
    />
    <path d="M8.9 14.2h30.2v.6a2.6 2.6 0 0 1-2.6 2.6h-25a2.6 2.6 0 0 1-2.6-2.6v-.6Z" fill="#41688E" />
  </>
);

/** Tapered cylinder plus ribs. Drawn under the lid in both states. */
const CAN = (
  <>
    <path d="M11.8 17.4h24.4l-2.05 22.1A3 3 0 0 1 31.17 42H16.83a3 3 0 0 1-2.98-2.5L11.8 17.4Z" fill="#A7C3DC" />
    <path d="M17.2 20.6h2.7l.83 15.8h-2.35L17.2 20.6Z" fill="#7BA0C2" />
    <path d="M22.65 20.6h2.7l.05 15.8h-2.8l.05-15.8Z" fill="#7BA0C2" />
    <path d="M28.1 20.6h2.7l-1.18 15.8h-2.35l.83-15.8Z" fill="#7BA0C2" />
  </>
);

/** Silhouette-only bin for the 16-20px tier: body, one rib, rim. */
const CAN_MICRO = (
  <>
    <path d="M11 17h26l-2.2 22.6A3.4 3.4 0 0 1 31.4 42.7H16.6a3.4 3.4 0 0 1-3.4-3.1L11 17Z" fill="#A7C3DC" />
    <path d="M23 21.5h2.8v15.5H23v-15.5Z" fill="#7BA0C2" />
    <path
      d="M8 10.5h32a3.4 3.4 0 0 1 3.4 3.4v.6a3.4 3.4 0 0 1-3.4 3.4H8a3.4 3.4 0 0 1-3.4-3.4v-.6A3.4 3.4 0 0 1 8 10.5Z"
      fill="#41688E"
    />
  </>
);

export const RecycleBinEmptyIcon = createAppIcon("RecycleBinEmptyIcon", {
  full: (
    <>
      {/* handle tab on the closed lid */}
      <path d="M20.6 5.4h6.8a2.4 2.4 0 0 1 2.4 2.4V10H18.2V7.8a2.4 2.4 0 0 1 2.4-2.4Z" fill="#547FA8" />
      {CAN}
      {LID}
    </>
  ),
  micro: CAN_MICRO,
});

export const RecycleBinFullIcon = createAppIcon("RecycleBinFullIcon", {
  full: (
    <>
      {/* crumpled paper poking above the rim */}
      <path d="M12.4 13.8 11.2 8.8l4 .8L16.2 4.9l3.8 3.3 2.4-1.4.4 7H12.4Z" fill="#E6EFF8" />
      <path d="M20 8.2l2.4-1.4.4 7h-3.4L20 8.2Z" fill="#C3D6E9" />
      <path d="M23.2 13.8 22.4 7.8l4 1 1-5.8 4.2 4.2 3.2-2.6.8 5.4-2.2 3.8H23.2Z" fill="#F2F7FC" />
      <path d="M31.6 7.2l3.2-2.6.8 5.4-2.2 3.8h-3L31.6 7.2Z" fill="#C3D6E9" />
      {CAN}
      {LID}
    </>
  ),
  micro: (
    <>
      <path d="M12 12 10.8 5.4l5 1.2 1.6-5 5 4.4 3.2-3.8 4.2 4.2 3.8-2.4L34.6 12H12Z" fill="#C6DAEC" />
      {CAN_MICRO}
    </>
  ),
});
