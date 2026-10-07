import { createAppIcon } from "../app-icon";

/**
 * v86 (x86 emulator) - a CPU die: a dark square core, a lighter inner square
 * and pin stubs on all four sides.
 */
export const V86Icon = createAppIcon("V86Icon", {
  full: (
    <>
      {/* pin stubs - top */}
      <rect x="15.6" y="5.6" width="3.8" height="7.6" rx="1.4" fill="#8296AE" />
      <rect x="22.1" y="5.6" width="3.8" height="7.6" rx="1.4" fill="#8296AE" />
      <rect x="28.6" y="5.6" width="3.8" height="7.6" rx="1.4" fill="#8296AE" />
      {/* pin stubs - bottom */}
      <rect x="15.6" y="34.8" width="3.8" height="7.6" rx="1.4" fill="#8296AE" />
      <rect x="22.1" y="34.8" width="3.8" height="7.6" rx="1.4" fill="#8296AE" />
      <rect x="28.6" y="34.8" width="3.8" height="7.6" rx="1.4" fill="#8296AE" />
      {/* pin stubs - left */}
      <rect x="5.6" y="15.6" width="7.6" height="3.8" rx="1.4" fill="#8296AE" />
      <rect x="5.6" y="22.1" width="7.6" height="3.8" rx="1.4" fill="#8296AE" />
      <rect x="5.6" y="28.6" width="7.6" height="3.8" rx="1.4" fill="#8296AE" />
      {/* pin stubs - right */}
      <rect x="34.8" y="15.6" width="7.6" height="3.8" rx="1.4" fill="#8296AE" />
      <rect x="34.8" y="22.1" width="7.6" height="3.8" rx="1.4" fill="#8296AE" />
      <rect x="34.8" y="28.6" width="7.6" height="3.8" rx="1.4" fill="#8296AE" />
      {/* die */}
      <rect x="11.6" y="11.6" width="24.8" height="24.8" rx="3.6" fill="#28324A" />
      {/* inner core */}
      <rect x="18.4" y="18.4" width="11.2" height="11.2" rx="2.4" fill="#4FA3F7" />
    </>
  ),
  micro: (
    <>
      <rect x="15.6" y="4.8" width="4.6" height="9" rx="1.6" fill="#8296AE" />
      <rect x="27.8" y="4.8" width="4.6" height="9" rx="1.6" fill="#8296AE" />
      <rect x="15.6" y="34.2" width="4.6" height="9" rx="1.6" fill="#8296AE" />
      <rect x="27.8" y="34.2" width="4.6" height="9" rx="1.6" fill="#8296AE" />
      <rect x="4.8" y="15.6" width="9" height="4.6" rx="1.6" fill="#8296AE" />
      <rect x="4.8" y="27.8" width="9" height="4.6" rx="1.6" fill="#8296AE" />
      <rect x="34.2" y="15.6" width="9" height="4.6" rx="1.6" fill="#8296AE" />
      <rect x="34.2" y="27.8" width="9" height="4.6" rx="1.6" fill="#8296AE" />
      <rect x="10.4" y="10.4" width="27.2" height="27.2" rx="4" fill="#28324A" />
      <rect x="17.6" y="17.6" width="12.8" height="12.8" rx="2.6" fill="#4FA3F7" />
    </>
  ),
});
