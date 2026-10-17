import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/react/shallow";
import { resolveDisplayFilter } from "@/lib/display-filter";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

/** Above every window, flyout and dialog, like the screen itself. */
const OVERLAY_Z_INDEX = 100000;

/**
 * Inline, so the filters never depend on a stylesheet loading: whatever else
 * happens they cover the screen, never take a click, and never get a CSS filter
 * onto the desktop itself (which would break fixed-position children).
 */
const layerStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: OVERLAY_Z_INDEX,
  pointerEvents: "none",
};

/**
 * Brightness and Night light, as two screen layers in a portal on <body>:
 * a black layer whose opacity is capped (see display-filter), and a warm layer
 * that multiplies with what is underneath. Renders nothing at the defaults.
 */
export function DisplayFilterOverlay() {
  const { brightness, nightLight, nightLightStrength, batterySaver } = useSystemSettingsStore(
    useShallow((state) => ({
      brightness: state.brightness,
      nightLight: state.nightLight,
      nightLightStrength: state.nightLightStrength,
      batterySaver: state.batterySaver,
    }))
  );
  const { dimAlpha, warmColor } = resolveDisplayFilter({ brightness, nightLight, nightLightStrength, batterySaver });

  if (typeof document === "undefined" || (dimAlpha === 0 && !warmColor)) {
    return null;
  }

  return createPortal(
    <>
      {dimAlpha > 0 ? (
        <div
          className="w11-display-filter w11-display-filter--dim"
          aria-hidden="true"
          style={{ ...layerStyle, backgroundColor: `rgba(0, 0, 0, ${dimAlpha})` }}
        />
      ) : null}
      {warmColor ? (
        <div
          className="w11-display-filter w11-display-filter--warm"
          aria-hidden="true"
          style={{ ...layerStyle, backgroundColor: warmColor, mixBlendMode: "multiply" }}
        />
      ) : null}
    </>,
    document.body
  );
}
