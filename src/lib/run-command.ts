import { getAppRegistry } from "@/lib/app-registry";
import { resolveProgramApp, resolveRunPath, settingsSectionFromUri } from "@/lib/terminal-shell";
import { resolveLaunchProfile } from "@/lib/terminal-profiles";
import type { AppId, FileSystemRecord, WindowPayload } from "@/types/system";

export const RUN_HISTORY_KEY = "taaniel-os-run-history";
const RUN_HISTORY_SIZE = 10;
const RUN_MAX_LENGTH = 200;

export type RunTarget =
  | { kind: "app"; appId: AppId; payload?: WindowPayload }
  | { kind: "path"; path: string }
  | { kind: "url"; url: string }
  | { kind: "missing" };

/** Windows' Notepad is this OS's Notepad here, not the Notes app the terminal keeps it pointed at. */
const RUN_PROGRAMS: Record<string, AppId> = { notepad: "markdown" };

function asWebAddress(input: string) {
  const address = /^www\./i.test(input) || /^[\w-]+(\.[\w-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(input) ? `https://${input}` : input;
  if (!/^https?:\/\//i.test(address) || /\s/.test(address)) return null;

  try {
    const url = new URL(address);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

/** What Run opens for a line of text: a program, then a file or folder, then a website. */
export function resolveRunTarget(input: string, nodes: FileSystemRecord): RunTarget {
  const text = input.trim().slice(0, RUN_MAX_LENGTH);
  if (!text) return { kind: "missing" };

  if (/^ms-settings:/i.test(text)) {
    const section = settingsSectionFromUri(text);
    return { kind: "app", appId: "settings", payload: section ? { section } : undefined };
  }

  const program = text.toLowerCase().replace(/\.exe$/, "");
  const profile = resolveLaunchProfile(program);
  if (profile && profile !== "linux") return { kind: "app", appId: "terminal", payload: { profile } };

  const appId = Object.hasOwn(RUN_PROGRAMS, program) ? RUN_PROGRAMS[program] : resolveProgramApp(program);
  if (appId) return { kind: "app", appId };

  const titled = getAppRegistry().find((app) => !app.hidden && app.title.toLowerCase() === program);
  if (titled) return { kind: "app", appId: titled.id };

  const path = resolveRunPath(text, nodes);
  if (path) return { kind: "path", path };

  const url = asWebAddress(text);
  return url ? { kind: "url", url } : { kind: "missing" };
}

/** Saved lines are read back into an input, so only short plain strings are kept. */
export function readRunHistory(raw: string | null) {
  try {
    const saved: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter((entry): entry is string => typeof entry === "string" && entry.length > 0 && entry.length <= RUN_MAX_LENGTH).slice(0, RUN_HISTORY_SIZE);
  } catch {
    return [];
  }
}

export const addToRunHistory = (history: string[], entry: string) =>
  [entry, ...history.filter((item) => item.toLowerCase() !== entry.toLowerCase())].slice(0, RUN_HISTORY_SIZE);
