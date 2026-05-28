/**
 * Custom MIME type used for in-app file/folder drag operations.
 *
 * The payload is a JSON-encoded `{ paths: string[] }` so multi-select drags
 * can carry every selected node. Single-item drags just put one entry in the
 * array.
 *
 * We deliberately use a custom MIME (rather than `text/plain`) so external
 * drags into the browser — where the dataTransfer only has `Files` — never
 * collide with our internal payload.
 */
export const TAANIEL_PATH_MIME = "application/x-taaniel-path";

export interface TaanielDragPayload {
  paths: string[];
}

export function setPathDragPayload(dataTransfer: DataTransfer | null, paths: string[]) {
  if (!dataTransfer || paths.length === 0) {
    return;
  }

  const payload: TaanielDragPayload = { paths };
  const encoded = JSON.stringify(payload);

  try {
    dataTransfer.setData(TAANIEL_PATH_MIME, encoded);
    // Browsers strip unknown MIMEs in some flows (drag between windows on Safari)
    // — fall back to text/plain so the data survives the round-trip.
    dataTransfer.setData("text/plain", encoded);
  } catch {
    /* Some browsers throw on setData during certain phases — ignore. */
  }

  dataTransfer.effectAllowed = "copyMove";
}

export function readPathDragPayload(dataTransfer: DataTransfer | null): string[] {
  if (!dataTransfer) {
    return [];
  }

  const tryParse = (raw: string | null): string[] => {
    if (!raw) {
      return [];
    }

    try {
      const decoded = JSON.parse(raw) as TaanielDragPayload;
      if (decoded && Array.isArray(decoded.paths)) {
        return decoded.paths.filter((entry): entry is string => typeof entry === "string");
      }
    } catch {
      /* Not our payload — ignore. */
    }

    return [];
  };

  const native = tryParse(dataTransfer.getData(TAANIEL_PATH_MIME));
  if (native.length > 0) {
    return native;
  }

  return tryParse(dataTransfer.getData("text/plain"));
}

export function hasPathDragPayload(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) {
    return false;
  }

  const types = Array.from(dataTransfer.types ?? []);
  return types.includes(TAANIEL_PATH_MIME);
}
