import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";

/** PSReadLine keeps the last 4096 commands; a browser has less room. */
export const HISTORY_LIMIT = 200;

/** A longest saved command: history is read back from storage that anything can write to. */
const MAX_ENTRY_LENGTH = 8192;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/;

/**
 * What history is read back as. Storage is not trusted: a typed command never holds
 * a control character, so an entry that does was written by something else, and
 * recalling or predicting it would put the characters on the screen.
 */
export function parseHistory(raw: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is string => typeof entry === "string" && entry.length <= MAX_ENTRY_LENGTH && !CONTROL_CHARACTERS.test(entry))
      .slice(-HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function loadHistory(key: string): string[] {
  return parseHistory(readLocalStorage(key));
}

/** Add a command (not twice in a row) and trim to the limit. Mutates the list the shell session holds. */
export function recordHistory(history: string[], input: string) {
  if (history.at(-1) !== input) history.push(input);
  history.splice(0, Math.max(0, history.length - HISTORY_LIMIT));
}

export function saveHistory(key: string, history: string[]) {
  writeLocalStorage(key, JSON.stringify(history));
}
