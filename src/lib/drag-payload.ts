/**
 * Cross-window file drag payload.
 *
 * Custom MIME type used by the file explorer, desktop icons, and any
 * other surface that wants to advertise a virtual-FS path as a drag
 * source. Window frames listen for this type and route accepted drops
 * to the target app via `launchApp({ appId, payload: { filePath } })`.
 *
 * We use a custom MIME (not just `text/plain`) so OS-level text drags
 * never accidentally launch apps.
 */
export const TAANIEL_PATH_MIME = "application/x-taaniel-path";

export function setPathDragPayload(dataTransfer: DataTransfer, path: string) {
  try {
    dataTransfer.setData(TAANIEL_PATH_MIME, path);
    // Provide text fallback so users dragging into a text field get the path.
    dataTransfer.setData("text/plain", path);
    dataTransfer.effectAllowed = "copyMove";
  } catch {
    // setData can throw in protected contexts (e.g. cross-origin iframes).
  }
}

export function readPathDragPayload(dataTransfer: DataTransfer): string | null {
  const path = dataTransfer.getData(TAANIEL_PATH_MIME);
  return path && path.startsWith("/") ? path : null;
}

export function hasPathDragPayload(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes(TAANIEL_PATH_MIME);
}
