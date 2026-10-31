import { SETTINGS_SECTIONS, getSettingsSection, type SettingsSectionId } from "@/lib/settings-sections";

export interface SettingsSearchEntry {
  /** Matches the settingId of the row it names. */
  id: string;
  section: SettingsSectionId;
  title: string;
  /** Extra words people may type for it. */
  keywords?: string[];
}

/** Every individual setting, by the page it lives on. Each id is the settingId of a row on that page. */
export const SETTINGS_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  { id: "brightness", section: "display", title: "Brightness", keywords: ["dim", "screen"] },
  { id: "night-light", section: "display", title: "Night light", keywords: ["blue light", "warm"] },
  { id: "volume", section: "sound", title: "Volume", keywords: ["speaker", "loud"] },
  { id: "mute", section: "sound", title: "Mute", keywords: ["silence"] },
  { id: "test-speakers", section: "sound", title: "Test your speakers", keywords: ["tone"] },
  { id: "do-not-disturb", section: "notifications", title: "Do not disturb", keywords: ["dnd", "focus", "toast", "quiet"] },
  { id: "notification-history", section: "notifications", title: "Notification history", keywords: ["recent", "log"] },
  { id: "test-notification", section: "notifications", title: "Send a test notification" },
  { id: "battery-saver", section: "power", title: "Battery saver", keywords: ["energy"] },
  { id: "browser-storage", section: "storage", title: "Browser storage", keywords: ["quota", "usage", "persistent"] },
  { id: "file-usage", section: "storage", title: "Files by folder", keywords: ["disk", "space"] },
  { id: "recycle-bin", section: "storage", title: "Empty Recycle Bin", keywords: ["trash", "delete"] },
  { id: "wifi", section: "network", title: "Wi-Fi", keywords: ["wireless"] },
  { id: "airplane-mode", section: "network", title: "Airplane mode", keywords: ["flight", "offline"] },
  { id: "accent", section: "personalization", title: "Accent colour", keywords: ["color", "colour", "highlight"] },
  { id: "transparency", section: "personalization", title: "Transparency effects", keywords: ["glass", "blur", "acrylic"] },
  { id: "taskbar-alignment", section: "personalization", title: "Taskbar alignment", keywords: ["left", "center", "centre", "start button"] },
  { id: "show-desktop-icons", section: "personalization", title: "Show desktop icons", keywords: ["hide", "icons"] },
  { id: "desktop-icon-size", section: "personalization", title: "Desktop icon size", keywords: ["small", "large"] },
  { id: "wallpaper-fit", section: "personalization", title: "Wallpaper fit", keywords: ["fill", "stretch", "tile", "background"] },
  { id: "theme", section: "personalization", title: "Theme", keywords: ["wallpaper", "background", "retro"] },
  { id: "installed-apps", section: "apps", title: "Installed apps", keywords: ["open", "launch", "applications"] },
  { id: "default-apps", section: "apps", title: "Default apps", keywords: ["open with", "file type", "extension", "association"] },
  { id: "text-size", section: "accessibility", title: "Text size", keywords: ["font", "zoom", "larger"] },
  { id: "more-contrast", section: "accessibility", title: "More contrast", keywords: ["high contrast"] },
  { id: "animation-effects", section: "accessibility", title: "Animation effects", keywords: ["reduce motion", "motion"] },
  { id: "recent-files", section: "privacy", title: "Recent files", keywords: ["clear", "history"] },
  { id: "browser-history", section: "privacy", title: "Browsing history", keywords: ["clear", "browser", "visited"] },
  { id: "local-data", section: "privacy", title: "Data stored on this device", keywords: ["localstorage", "indexeddb", "cookies"] },
  { id: "export-settings", section: "privacy", title: "Export settings", keywords: ["backup", "download", "json"] },
  { id: "import-settings", section: "privacy", title: "Import settings", keywords: ["restore", "upload", "json"] },
  { id: "hour-cycle", section: "time", title: "Clock format", keywords: ["24-hour", "24 hour", "12 hour", "am pm", "time format"] },
  { id: "clock-seconds", section: "time", title: "Show seconds in the taskbar clock", keywords: ["clock"] },
  { id: "date-format", section: "time", title: "Short date format", keywords: ["day", "month", "year"] },
  { id: "first-day", section: "time", title: "First day of the week", keywords: ["monday", "sunday", "calendar"] },
  { id: "shortcuts", section: "input", title: "Keyboard shortcuts", keywords: ["hotkeys", "keys"] },
  { id: "pointer", section: "input", title: "Pointer and touch", keywords: ["mouse", "touchscreen"] },
  { id: "device-specs", section: "about", title: "Device specifications", keywords: ["processor", "memory", "gpu", "screen", "browser"] },
  { id: "copy-details", section: "about", title: "Copy device details", keywords: ["clipboard"] },
  { id: "reset-desktop", section: "about", title: "Reset desktop", keywords: ["reset this pc", "restore", "defaults"] },
];

export interface SettingsSearchResult extends SettingsSearchEntry {
  pageTitle: string;
}

const MAX_RESULTS = 12;

/** Settings whose title or keywords hold every word typed. Titles that start with the query come first. */
export function searchSettings(query: string): SettingsSearchResult[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [];
  }

  const pageEntries: SettingsSearchEntry[] = SETTINGS_SECTIONS.map((section) => ({
    id: `page:${section.id}`,
    section: section.id,
    title: section.title,
    keywords: section.keywords,
  }));

  return [...SETTINGS_SEARCH_ENTRIES, ...pageEntries]
    .map((entry) => {
      const title = entry.title.toLowerCase();
      const haystack = [title, ...(entry.keywords ?? []).map((keyword) => keyword.toLowerCase())].join(" ");
      const matches = words.every((word) => haystack.includes(word));
      const score = !matches ? 0 : title.startsWith(words[0]) ? 3 : title.includes(words[0]) ? 2 : 1;

      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map(({ entry }) => ({ ...entry, pageTitle: getSettingsSection(entry.section).title }));
}
