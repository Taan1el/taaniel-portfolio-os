import type { StateStorage } from "zustand/middleware";

export function readLocalStorage(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalStorage(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Persistence is optional; keep the UI usable when storage is blocked.
  }
}

export function removeLocalStorage(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Persistence is optional; keep the UI usable when storage is blocked.
  }
}

export function getSafeLocalStorage(): StateStorage {
  return {
    getItem: readLocalStorage,
    setItem: writeLocalStorage,
    removeItem: removeLocalStorage,
  };
}
