import type { AccentId } from "@/stores/system-settings-store";

/** Swatch colours for the picker. The stylesheet (win11-a11y.css) holds the same colours for the shell. */
export const ACCENT_SWATCHES: Record<AccentId, { label: string; color: string }> = {
  default: { label: "Default blue", color: "#60cdff" },
  sky: { label: "Sky", color: "#7fb4ff" },
  mint: { label: "Mint", color: "#5fe3b4" },
  lime: { label: "Lime", color: "#b5e35a" },
  amber: { label: "Amber", color: "#ffc95c" },
  coral: { label: "Coral", color: "#ff9a7a" },
  rose: { label: "Rose", color: "#ff8fb8" },
  violet: { label: "Violet", color: "#b99cff" },
};
