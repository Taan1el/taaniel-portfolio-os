import { createAppIcon } from "../app-icon";

/** Task Manager - a heartbeat line on a dark screen. */
export const TaskManagerIcon = createAppIcon("TaskManagerIcon", {
  full: (
    <>
      <rect x="4" y="7" width="40" height="34" rx="6" fill="#1F2733" />
      <rect x="4" y="7" width="40" height="7" rx="3.5" fill="#3B82F6" />
      <path d="M9 28H17L20.5 19.5L26 34L29.5 25L31.5 28H39" fill="none" stroke="#5EEAD4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  micro: (
    <>
      <rect x="4" y="7" width="40" height="34" rx="6" fill="#1F2733" />
      <path d="M8 25H16L20.5 14L27 35L31 25H40" fill="none" stroke="#5EEAD4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
});
