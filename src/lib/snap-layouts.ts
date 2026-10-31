import type { WindowBounds } from "@/types/system";

/** One slot of a layout, as fractions of the desktop. */
export interface SnapZone {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface SnapLayout {
  id: string;
  zones: SnapZone[];
}

const THIRD = 1 / 3;

export const SNAP_LAYOUTS: SnapLayout[] = [
  {
    id: "halves",
    zones: [
      { x: 0, y: 0, width: 0.5, height: 1, label: "left half" },
      { x: 0.5, y: 0, width: 0.5, height: 1, label: "right half" },
    ],
  },
  {
    id: "wide-left",
    zones: [
      { x: 0, y: 0, width: 2 * THIRD, height: 1, label: "wide left" },
      { x: 2 * THIRD, y: 0, width: THIRD, height: 1, label: "narrow right" },
    ],
  },
  {
    id: "thirds",
    zones: [
      { x: 0, y: 0, width: THIRD, height: 1, label: "left third" },
      { x: THIRD, y: 0, width: THIRD, height: 1, label: "middle third" },
      { x: 2 * THIRD, y: 0, width: THIRD, height: 1, label: "right third" },
    ],
  },
  {
    id: "side-stack",
    zones: [
      { x: 0, y: 0, width: 0.5, height: 1, label: "left half" },
      { x: 0.5, y: 0, width: 0.5, height: 0.5, label: "top right" },
      { x: 0.5, y: 0.5, width: 0.5, height: 0.5, label: "bottom right" },
    ],
  },
  {
    id: "quarters",
    zones: [
      { x: 0, y: 0, width: 0.5, height: 0.5, label: "top left" },
      { x: 0.5, y: 0, width: 0.5, height: 0.5, label: "top right" },
      { x: 0, y: 0.5, width: 0.5, height: 0.5, label: "bottom left" },
      { x: 0.5, y: 0.5, width: 0.5, height: 0.5, label: "bottom right" },
    ],
  },
];

export const LEFT_HALF = SNAP_LAYOUTS[0].zones[0];
export const RIGHT_HALF = SNAP_LAYOUTS[0].zones[1];

/** Pixel bounds of a zone. Rounding shares edges, so neighbouring windows never gap or overlap. */
export function zoneBounds(zone: SnapZone, desktop: { width: number; height: number }): WindowBounds {
  const x = Math.round(zone.x * desktop.width);
  const y = Math.round(zone.y * desktop.height);
  return {
    x,
    y,
    width: Math.round((zone.x + zone.width) * desktop.width) - x,
    height: Math.round((zone.y + zone.height) * desktop.height) - y,
  };
}
