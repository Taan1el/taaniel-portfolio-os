import { createAppIcon } from "../app-icon";

/** Spreadsheet - a green sheet with a grid. */
export const SpreadsheetIcon = createAppIcon("SpreadsheetIcon", {
  full: (
    <>
      <rect x="6" y="5" width="36" height="38" rx="5" fill="#E8F5EE" />
      <path d="M6 10A5 5 0 0 1 11 5H37A5 5 0 0 1 42 10V16H6Z" fill="#107C41" />
      <path d="M18 16V43M30 16V43M6 25H42M6 34H42" stroke="#107C41" strokeWidth="2" />
      <rect x="18" y="25" width="12" height="9" fill="#34D399" />
    </>
  ),
  micro: (
    <>
      <rect x="5" y="4" width="38" height="40" rx="5" fill="#E8F5EE" />
      <path d="M5 9A5 5 0 0 1 10 4H38A5 5 0 0 1 43 9V16H5Z" fill="#107C41" />
      <path d="M18 16V44M31 16V44M5 30H43" stroke="#107C41" strokeWidth="3" />
    </>
  ),
});
