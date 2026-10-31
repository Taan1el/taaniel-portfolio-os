import { DEFAULT_SYSTEM_SETTINGS, sanitizeSystemSettings, type SystemSettings } from "@/stores/system-settings-store";

export const SETTINGS_EXPORT_KIND = "taaniel-os-settings";
export const SETTINGS_EXPORT_VERSION = 1;
/** A real export is well under 4 KB; anything bigger is not one. */
export const SETTINGS_IMPORT_MAX_BYTES = 64 * 1024;

export function buildSettingsExport(settings: SystemSettings): string {
  return JSON.stringify(
    { kind: SETTINGS_EXPORT_KIND, version: SETTINGS_EXPORT_VERSION, settings: sanitizeSystemSettings(settings) },
    null,
    2
  );
}

export type SettingsImportResult =
  | { ok: true; values: Record<string, unknown>; count: number }
  | { ok: false; error: string };

/** Check a pasted or chosen export before anything is applied. Only the fields it carries are returned. */
export function parseSettingsImport(text: string): SettingsImportResult {
  if (text.length > SETTINGS_IMPORT_MAX_BYTES) {
    return { ok: false, error: "That file is too large to be a settings export." };
  }

  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "That is not valid JSON." };
  }

  const record = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;

  if (!record || record.kind !== SETTINGS_EXPORT_KIND) {
    return { ok: false, error: "That file is not a Taaniel OS settings export." };
  }

  if (record.version !== SETTINGS_EXPORT_VERSION) {
    return { ok: false, error: "That export was made by a different version." };
  }

  const settings = record.settings;

  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return { ok: false, error: "The export has no settings in it." };
  }

  const known = Object.keys(DEFAULT_SYSTEM_SETTINGS).filter((key) => Object.hasOwn(settings, key));

  if (known.length === 0) {
    return { ok: false, error: "The export has no settings this version knows." };
  }

  return { ok: true, values: Object.fromEntries(known.map((key) => [key, (settings as Record<string, unknown>)[key]])), count: known.length };
}
