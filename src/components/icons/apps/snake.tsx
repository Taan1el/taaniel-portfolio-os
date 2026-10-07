import { createAppIcon } from "../app-icon";

/**
 * Snake - a coiled snake of chunky rounded blocks on a deep-forest tile,
 * curling clockwise around a red apple pellet. Flat fills only.
 *
 * Palette: tile #10291C, body #22C55E, head #4ADE80, apple #EF4444.
 */
export const SnakeIcon = createAppIcon("SnakeIcon", {
  full: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="9" fill="#10291C" />

      {/* coil body - clockwise from the head gap on the left edge */}
      <rect x="16" y="7" width="8" height="8" rx="2.2" fill="#22C55E" />
      <rect x="25" y="7" width="8" height="8" rx="2.2" fill="#22C55E" />
      <rect x="34" y="7" width="8" height="8" rx="2.2" fill="#22C55E" />
      <rect x="34" y="16" width="8" height="8" rx="2.2" fill="#22C55E" />
      <rect x="34" y="25" width="8" height="8" rx="2.2" fill="#22C55E" />
      <rect x="34" y="34" width="8" height="8" rx="2.2" fill="#22C55E" />
      <rect x="25" y="34" width="8" height="8" rx="2.2" fill="#22C55E" />
      <rect x="16" y="34" width="8" height="8" rx="2.2" fill="#22C55E" />
      <rect x="7" y="34" width="8" height="8" rx="2.2" fill="#22C55E" />
      <rect x="7" y="25" width="8" height="8" rx="2.2" fill="#1FAE55" />

      {/* head */}
      <rect x="6.4" y="6.4" width="9.2" height="9.2" rx="2.9" fill="#4ADE80" />
      <circle cx="9.6" cy="12.2" r="1.25" fill="#0B1F13" />
      <circle cx="13" cy="12.2" r="1.25" fill="#0B1F13" />

      {/* apple pellet */}
      <circle cx="24" cy="25" r="6" fill="#EF4444" />
      <rect x="23.1" y="17.4" width="1.8" height="3.4" rx="0.9" fill="#7C3E22" />
      <path d="M25 20.2C26.6 17.6 29.4 17.1 30.8 17.6C30.4 20.4 27.8 21.8 25 20.9Z" fill="#16A34A" />
    </>
  ),
  micro: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="9" fill="#10291C" />
      <rect x="7" y="7" width="35" height="8" rx="3" fill="#22C55E" />
      <rect x="34" y="7" width="8" height="35" rx="3" fill="#22C55E" />
      <rect x="7" y="34" width="35" height="8" rx="3" fill="#22C55E" />
      <rect x="7" y="25" width="8" height="17" rx="3" fill="#22C55E" />
      <rect x="6" y="6" width="10" height="10" rx="3.4" fill="#4ADE80" />
      <circle cx="24" cy="24.5" r="6.5" fill="#EF4444" />
    </>
  ),
});
