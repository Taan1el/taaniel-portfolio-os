import { SETTINGS_STORAGE_KEY, SHELL_STORAGE_KEY, WINDOW_STORAGE_KEY, PROCESS_STORAGE_KEY } from "@/stores/system-runtime";

export interface LocalStorageEntry {
  key: string;
  label: string;
  /** UTF-16 code units times two, which is how much space the browser charges for it. */
  bytes: number;
}

/** What each key the OS writes holds. Keys not listed here show with their own name. */
const KNOWN_KEYS: Record<string, string> = {
  [SETTINGS_STORAGE_KEY]: "Settings",
  [SHELL_STORAGE_KEY]: "Theme, wallpaper, pinned apps, icon positions",
  [WINDOW_STORAGE_KEY]: "Open windows",
  [PROCESS_STORAGE_KEY]: "Running apps",
  "taaniel-os:recent-files": "Recent files",
  "taaniel-os-achievements-v1": "Achievements",
};

export function describeStorageKey(key: string): string {
  return KNOWN_KEYS[key] ?? key;
}

/** Every localStorage key of this site with its size. Empty when the browser blocks storage. */
export function listLocalStorage(storage: Pick<Storage, "length" | "key" | "getItem"> | null): LocalStorageEntry[] {
  if (!storage) return [];

  const entries: LocalStorageEntry[] = [];

  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key === null) continue;
      const value = storage.getItem(key) ?? "";
      entries.push({ key, label: describeStorageKey(key), bytes: (key.length + value.length) * 2 });
    }
  } catch {
    return [];
  }

  return entries.sort((a, b) => b.bytes - a.bytes || a.key.localeCompare(b.key));
}

/** Names of this site's IndexedDB databases; empty where the browser cannot list them. */
export async function listIndexedDatabases(factory: Pick<IDBFactory, "databases"> | null): Promise<string[]> {
  try {
    const databases = (await factory?.databases?.()) ?? [];
    return databases.map((database) => database.name).filter((name): name is string => Boolean(name));
  } catch {
    return [];
  }
}
