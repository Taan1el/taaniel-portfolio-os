/*
 * Items that arrive on the desktop from a drag land where they were dropped,
 * as in Windows. Only the desktop surface knows its grid and where it is on
 * screen, so it registers a handler here and the drag code calls it.
 */

type Point = { x: number; y: number };
type PlacementHandler = (paths: string[], point: Point) => void;

let handler: PlacementHandler | null = null;

export function registerDesktopPlacement(next: PlacementHandler) {
  handler = next;

  return () => {
    if (handler === next) {
      handler = null;
    }
  };
}

/** Put the paths that just landed in /Desktop at the drop point. No-op when no desktop is mounted. */
export function placeArrivalsOnDesktop(paths: string[], point: Point) {
  if (paths.length > 0) {
    handler?.(paths, point);
  }
}
