/**
 * Session snapshot — export/import the user's customised state as JSON.
 *
 * Inspired by copy.sh/v86's "Save State / Load State" buttons. Lets a
 * visitor capture the in-memory filesystem (notes, uploaded photos,
 * folder structure) to a downloadable file, then restore it later.
 *
 * v1 scope: filesystem only. That's where actual user data lives —
 * theme + wallpaper are easy to redo and would just add bytes here.
 */
import { toast } from "@/stores/toast-store";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { FileSystemRecord } from "@/types/system";

export const SNAPSHOT_VERSION = 1;

interface SessionSnapshot {
  v: number;
  exportedAt: string;
  nodes: FileSystemRecord;
}

function timestampFilename() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `taaniel-os-snapshot-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
}

export function buildSnapshot(): SessionSnapshot {
  return {
    v: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    nodes: useFileSystemStore.getState().nodes,
  };
}

/** Trigger a JSON download of the current session. */
export function exportSession() {
  try {
    const snapshot = buildSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = timestampFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("Snapshot exported", "success");
  } catch {
    toast("Could not export snapshot", "error");
  }
}

/** Parse a JSON string into a snapshot, validating shape. */
export function parseSnapshot(raw: string): SessionSnapshot {
  const parsed = JSON.parse(raw) as Partial<SessionSnapshot>;
  if (
    !parsed ||
    typeof parsed.v !== "number" ||
    parsed.v > SNAPSHOT_VERSION ||
    !parsed.nodes ||
    typeof parsed.nodes !== "object"
  ) {
    throw new Error("Not a Taaniel OS snapshot");
  }
  return parsed as SessionSnapshot;
}

/** Import from a JSON string. Resolves to true on success. */
export async function importSessionFromJson(raw: string): Promise<boolean> {
  try {
    const snapshot = parseSnapshot(raw);
    await useFileSystemStore.getState().importNodes(snapshot.nodes);
    toast("Snapshot restored", "success");
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Restore failed";
    toast(message, "error");
    return false;
  }
}

/**
 * Open a hidden file input, read the chosen file as text, restore.
 * Convenience for UI buttons.
 */
export function importSessionFromFilePicker() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      void importSessionFromJson(text);
    };
    reader.onerror = () => toast("Could not read snapshot file", "error");
    reader.readAsText(file);
  });
  input.click();
}
