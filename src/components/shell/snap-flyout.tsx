import { createPortal } from "react-dom";
import { SNAP_LAYOUTS, type SnapZone } from "@/lib/snap-layouts";

interface SnapFlyoutProps {
  anchor: DOMRect;
  onPick: (zone: SnapZone) => void;
  onHoverChange: (hovering: boolean) => void;
}

const WIDTH = 276;

/** The layout picker that appears when the pointer rests on a window's maximize button. */
export function SnapFlyout({ anchor, onPick, onHoverChange }: SnapFlyoutProps) {
  const left = Math.max(8, Math.min(anchor.right - WIDTH + 40, window.innerWidth - WIDTH - 8));

  return createPortal(
    <div
      className="w11-flyout w11-snap"
      role="group"
      aria-label="Snap layouts"
      data-dnd-barrier
      style={{ left, top: anchor.bottom + 6, width: WIDTH }}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      {SNAP_LAYOUTS.map((layout) => (
        <div key={layout.id} className="w11-snap__layout">
          {layout.zones.map((zone) => (
            <button
              key={zone.label}
              type="button"
              className="w11-snap__zone"
              aria-label={`Snap to ${zone.label}`}
              title={`Snap to ${zone.label}`}
              style={{
                left: `${zone.x * 100}%`,
                top: `${zone.y * 100}%`,
                width: `${zone.width * 100}%`,
                height: `${zone.height * 100}%`,
              }}
              onClick={() => onPick(zone)}
            />
          ))}
        </div>
      ))}
    </div>,
    document.body
  );
}
