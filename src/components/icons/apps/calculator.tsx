import { createAppIcon } from "../app-icon";

/**
 * Calculator - a rounded slate body with a dark display strip, a nine-key grid
 * and a single accent-blue equals key.
 */
export const CalculatorIcon = createAppIcon("CalculatorIcon", {
  full: (
    <>
      {/* body */}
      <path
        d="M12 4H36A4 4 0 0 1 40 8V40A4 4 0 0 1 36 44H12A4 4 0 0 1 8 40V8A4 4 0 0 1 12 4Z"
        fill="#D6DEEA"
      />
      {/* display strip */}
      <rect x="12" y="8" width="24" height="9.2" rx="2.4" fill="#22314A" />
      {/* readout bar */}
      <rect x="26.4" y="11.8" width="7.2" height="2.4" rx="1.2" fill="#7FB2E8" />
      {/* key grid - 4px bezel on every side, matching the display strip */}
      <rect x="12" y="19.6" width="6.2" height="5.6" rx="1.6" fill="#8FA2BC" />
      <rect x="20.9" y="19.6" width="6.2" height="5.6" rx="1.6" fill="#8FA2BC" />
      <rect x="29.8" y="19.6" width="6.2" height="5.6" rx="1.6" fill="#8FA2BC" />
      <rect x="12" y="27" width="6.2" height="5.6" rx="1.6" fill="#8FA2BC" />
      <rect x="20.9" y="27" width="6.2" height="5.6" rx="1.6" fill="#8FA2BC" />
      <rect x="29.8" y="27" width="6.2" height="5.6" rx="1.6" fill="#8FA2BC" />
      <rect x="12" y="34.4" width="6.2" height="5.6" rx="1.6" fill="#8FA2BC" />
      <rect x="20.9" y="34.4" width="6.2" height="5.6" rx="1.6" fill="#8FA2BC" />
      {/* equals key */}
      <rect x="29.8" y="34.4" width="6.2" height="5.6" rx="1.6" fill="#2C74DC" />
    </>
  ),
  micro: (
    <>
      <path
        d="M12 4H36A4 4 0 0 1 40 8V40A4 4 0 0 1 36 44H12A4 4 0 0 1 8 40V8A4 4 0 0 1 12 4Z"
        fill="#D6DEEA"
      />
      <rect x="12" y="8" width="24" height="9.6" rx="2.6" fill="#22314A" />
      <rect x="12" y="20.4" width="10.8" height="19.6" rx="2.6" fill="#8FA2BC" />
      <rect x="25.2" y="20.4" width="10.8" height="19.6" rx="2.6" fill="#2C74DC" />
    </>
  ),
});
