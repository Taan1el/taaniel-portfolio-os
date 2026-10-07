import { createAppIcon } from "../app-icon";

/**
 * Settings - a flat grey-blue gear with eight geometric teeth and a clean
 * circular hub. Two-tone body, flat fills only.
 */
export const SettingsIcon = createAppIcon("SettingsIcon", {
  full: (
    <>
      {/* eight teeth, drawn as four crossed bars */}
      <rect x="21" y="4" width="6" height="40" rx="2" fill="#4F6B8C" />
      <rect
        x="21"
        y="4"
        width="6"
        height="40"
        rx="2"
        fill="#4F6B8C"
        transform="rotate(45 24 24)"
      />
      <rect
        x="21"
        y="4"
        width="6"
        height="40"
        rx="2"
        fill="#4F6B8C"
        transform="rotate(90 24 24)"
      />
      <rect
        x="21"
        y="4"
        width="6"
        height="40"
        rx="2"
        fill="#4F6B8C"
        transform="rotate(135 24 24)"
      />
      {/* gear body */}
      <circle cx="24" cy="24" r="14.6" fill="#4F6B8C" />
      {/* lighter inner ring */}
      <circle cx="24" cy="24" r="10.6" fill="#6C8CAE" />
      {/* hub */}
      <circle cx="24" cy="24" r="6.4" fill="#EDF3FA" />
    </>
  ),
  micro: (
    <>
      <rect x="20.4" y="4" width="7.2" height="40" rx="2.4" fill="#4F6B8C" />
      <rect
        x="20.4"
        y="4"
        width="7.2"
        height="40"
        rx="2.4"
        fill="#4F6B8C"
        transform="rotate(60 24 24)"
      />
      <rect
        x="20.4"
        y="4"
        width="7.2"
        height="40"
        rx="2.4"
        fill="#4F6B8C"
        transform="rotate(120 24 24)"
      />
      <circle cx="24" cy="24" r="14.6" fill="#4F6B8C" />
      <circle cx="24" cy="24" r="6.6" fill="#EDF3FA" />
    </>
  ),
});
