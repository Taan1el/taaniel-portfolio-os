/**
 * Pages of the Settings app. Launching Settings with `{ section }` in the
 * window payload opens it on that page, the way ms-settings: links do.
 */
export const SETTINGS_SECTION_IDS = [
  "system",
  "display",
  "sound",
  "power",
  "network",
  "personalization",
  "accessibility",
  "time",
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
    id: "power",
    title: "Power & battery",
    description: "Battery usage, battery saver",
    keywords: ["power", "battery", "battery saver", "energy", "charging"],
  },
  {
    id: "network",
    title: "Network & internet",
    description: "Wi-Fi, airplane mode",
    keywords: ["network", "internet", "wifi", "wi-fi", "airplane mode", "offline", "connection"],
  },
  {
    id: "personalization",
    title: "Personalization",
    description: "Background, colors, themes",
    keywords: ["personalization", "personalize", "theme", "wallpaper", "background", "colors"],
  },
  {
    id: "accessibility",
    title: "Accessibility",
    description: "Visual effects, animation",
    keywords: ["accessibility", "animation effects", "reduce motion", "motion", "visual effects"],
  },
  {
    id: "time",
    title: "Time & language",
    description: "Date, time zone, region",
    keywords: ["time", "date", "clock", "time zone", "language", "region"],
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
