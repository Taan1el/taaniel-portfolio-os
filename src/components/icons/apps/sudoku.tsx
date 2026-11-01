import { createAppIcon } from "../app-icon";

/** Sudoku - a light grid with three digits. */
export const SudokuIcon = createAppIcon("SudokuIcon", {
  full: (
    <>
      <rect x="5" y="5" width="38" height="38" rx="6" fill="#F2F5FA" />
      <path d="M17.7 5V43M30.3 5V43M5 17.7H43M5 30.3H43" stroke="#2A3247" strokeWidth="1.8" />
      <rect x="18.6" y="18.6" width="10.8" height="10.8" fill="#BFDBFE" />
      <path d="M9 9.5H13.6L11 13.2A2.4 2.4 0 1 1 8.8 16.4" fill="none" stroke="#1D4ED8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22.3 26.6L26 21.9H21.7" fill="none" stroke="#2A3247" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38.2 31.9L34.2 39.6M34 34.2H39.2" fill="none" stroke="#1D4ED8" strokeWidth="1.9" strokeLinecap="round" />
    </>
  ),
  micro: (
    <>
      <rect x="4" y="4" width="40" height="40" rx="6" fill="#F2F5FA" />
      <path d="M17.3 4V44M30.7 4V44M4 17.3H44M4 30.7H44" stroke="#2A3247" strokeWidth="3" />
      <rect x="18.8" y="18.8" width="10.4" height="10.4" fill="#3B82F6" />
    </>
  ),
});
