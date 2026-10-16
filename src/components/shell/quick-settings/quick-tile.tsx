import type { ReactNode } from "react";

interface QuickTileProps {
  icon: ReactNode;
  label: string;
  /** A short status under the label, like "Connected" under Wi-Fi. */
  status?: string;
  pressed: boolean;
  onToggle: () => void;
}

/** A Quick Settings toggle: filled with the accent colour while on, like the WinUI toggle tiles. */
export function QuickTile({ icon, label, status, pressed, onToggle }: QuickTileProps) {
  return (
    <button type="button" className="w11-quick__tile" aria-pressed={pressed} onClick={onToggle}>
      <span className="w11-quick__tile-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="w11-quick__tile-text">
        <span className="w11-quick__tile-label">{label}</span>
        {status ? <span className="w11-quick__tile-status">{status}</span> : null}
      </span>
    </button>
  );
}
