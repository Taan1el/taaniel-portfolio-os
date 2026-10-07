import { createAppIcon } from "../app-icon";

/**
 * Dino - the offline runner: a chunky pixel T-rex built from axis-aligned
 * blocks, standing on a flat ground rule over a pale paper tile.
 *
 * Palette: tile #EAECEF, dino #52575E, ground #A8AEB8, eye #FFFFFF.
 */
export const DinoIcon = createAppIcon("DinoIcon", {
  full: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="9" fill="#EAECEF" />

      {/* tail */}
      <rect x="8" y="15" width="5" height="3" fill="#52575E" />
      <rect x="8" y="18" width="8" height="6" fill="#52575E" />

      {/* body */}
      <rect x="15" y="18" width="16" height="12" fill="#52575E" />

      {/* neck, skull and jaw */}
      <rect x="24" y="15" width="8" height="6" fill="#52575E" />
      <rect x="30" y="9" width="11" height="6" fill="#52575E" />
      <rect x="30" y="15" width="8" height="3" fill="#52575E" />

      {/* eye */}
      <rect x="36.5" y="11" width="3" height="3" fill="#FFFFFF" />

      {/* arm */}
      <rect x="27" y="21.5" width="4" height="3" fill="#52575E" />

      {/* legs and feet */}
      <rect x="16" y="30" width="4" height="6" fill="#52575E" />
      <rect x="16" y="33" width="7" height="3" fill="#52575E" />
      <rect x="24" y="30" width="4" height="6" fill="#52575E" />
      <rect x="24" y="33" width="7" height="3" fill="#52575E" />

      {/* ground rule */}
      <rect x="5" y="37" width="38" height="3" rx="1.5" fill="#A8AEB8" />
    </>
  ),
  micro: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="9" fill="#EAECEF" />
      <rect x="29" y="9" width="12" height="9" rx="1" fill="#52575E" />
      <rect x="9" y="16" width="24" height="15" rx="2" fill="#52575E" />
      <rect x="14" y="29" width="7" height="8" fill="#52575E" />
      <rect x="24" y="29" width="7" height="8" fill="#52575E" />
      <rect x="5" y="37" width="38" height="3" rx="1.5" fill="#A8AEB8" />
    </>
  ),
});
