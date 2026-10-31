/**
 * Pages of the Settings app. Launching Settings with `{ section }` in the
 * window payload opens it on that page, the way ms-settings: links do.
 */
export const SETTINGS_SECTION_IDS = [
  "system",
  "display",
  "sound",
  "notifications",
  "power",
  "storage",
  "network",
  "personalization",
  "apps",
  "accessibility",
  "privacy",
  "time",
  "input",
  "about",
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number];

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = "system";

export interface SettingsSectionInfo {
  id: SettingsSectionId;
  title: string;
  /** One line under the title on the System overview. */
  description: string;
  /** Extra words Start search should match this page by. */
  keywords: string[];
}

export const SETTINGS_SECTIONS: SettingsSectionInfo[] = [
  {
    id: "system",
    title: "System",
    description: "Display, sound, power, network",
    keywords: ["system", "overview", "device"],
  },
  {
    id: "display",
    title: "Display",
    description: "Brightness, night light",
    keywords: ["display", "screen", "brightness", "night light", "blue light", "dim"],
  },
  {
    id: "sound",
    title: "Sound",
    description: "Volume levels, output",
    keywords: ["sound", "volume", "speakers", "audio", "mute"],
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Do not disturb, history",
    keywords: ["notifications", "do not disturb", "focus", "toast", "alerts", "history"],
  },
  {
    id: "power",
    title: "Power & battery",
    description: "Battery usage, battery saver",
    keywords: ["power", "battery", "battery saver", "energy", "charging"],
  },
  {
    id: "storage",
    title: "Storage",
    description: "Disk space, files, Recycle Bin",
    keywords: ["storage", "disk", "space", "quota", "recycle bin", "empty", "files", "usage"],
  },
  {
    id: "network",
    title: "Network & internet",
    description: "Wi-Fi, airplane mode",
    // "internet" is left to the Browser, which has long answered it; the page title still carries the word.
    keywords: ["network", "wifi", "wi-fi", "airplane mode", "offline", "connection"],
  },
  {
    id: "personalization",
    title: "Personalization",
    description: "Background, colors, themes",
    keywords: ["personalization", "personalize", "theme", "wallpaper", "background", "colors"],
  },
  {
    id: "apps",
    title: "Apps",
    description: "Installed apps, default apps",
    keywords: ["apps", "applications", "default apps", "open with", "file types", "installed"],
  },
  {
    id: "accessibility",
    title: "Accessibility",
    description: "Visual effects, animation",
    keywords: ["accessibility", "animation effects", "reduce motion", "motion", "visual effects"],
  },
  {
    id: "privacy",
    title: "Privacy",
    description: "Local data, history, export",
    keywords: ["privacy", "local data", "clear history", "recent files", "localstorage", "indexeddb", "export", "import", "backup"],
  },
  {
    id: "time",
    title: "Time & language",
    description: "Date, time zone, region",
    keywords: ["time", "date", "clock", "time zone", "language", "region"],
  },
  {
    id: "input",
    title: "Keyboard & input",
    description: "Keyboard shortcuts, pointer",
    keywords: ["keyboard", "shortcuts", "hotkeys", "mouse", "pointer", "touch", "input"],
  },
  {
    id: "about",
    title: "About",
    description: "This device, Taaniel OS",
    keywords: ["about", "version", "device", "specs", "system info", "processor", "memory", "reset"],
  },
];

const sectionIds = new Set<string>(SETTINGS_SECTION_IDS);

export function isSettingsSectionId(value: unknown): value is SettingsSectionId {
  return typeof value === "string" && sectionIds.has(value);
}

export function sanitizeSettingsSection(value: unknown): SettingsSectionId {
  return isSettingsSectionId(value) ? value : DEFAULT_SETTINGS_SECTION;
}

export function getSettingsSection(id: SettingsSectionId): SettingsSectionInfo {
  return SETTINGS_SECTIONS.find((section) => section.id === id) ?? SETTINGS_SECTIONS[0];
}
