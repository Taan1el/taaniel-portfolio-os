import { createAppIcon } from "../app-icon";

const locomotive = <>
  <rect x="4" y="4" width="40" height="40" rx="9" fill="#314837" />
  <path d="M10 34h29M12 38l4-4m19 4-4-4" stroke="#b7aa87" strokeWidth="2" />
  <rect x="13" y="22" width="22" height="9" rx="3" fill="#bc914c" />
  <path d="M27 15h10v16H27z" fill="#d6c9a5" />
  <path d="M29 18h5v6h-5zM16 16h5v7h-5z" fill="#24352b" />
  <path d="M25 14h14" stroke="#d6c9a5" strokeWidth="3" />
  <circle cx="18" cy="32" r="4" fill="#17261e" stroke="#d6c9a5" strokeWidth="1.5" />
  <circle cx="32" cy="32" r="4" fill="#17261e" stroke="#d6c9a5" strokeWidth="1.5" />
  <path d="M18 32h14" stroke="#bc914c" strokeWidth="2" />
</>;

export const NextStopIcon = createAppIcon("NextStopIcon", { full: locomotive, micro: locomotive });
