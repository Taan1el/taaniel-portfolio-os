import { useSystemSettingsStore } from "@/stores/system-settings-store";

/**
 * Heuristics for devices that should skip decorative GPU work.
 * The wallpaper pan/breathe loop runs forever, so constrained hardware
 * (low memory, few cores) or users on data-saver get the static gradient.
 * Battery saver, which the visitor can switch on from Quick Settings, does too.
 *
 * Battery saver is read straight from the settings store, so this is a plain
 * read, not a subscription: the caller has to render again when it changes
 * (the desktop does, through useShellServices).
 */
interface CapabilityNavigator extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

export function prefersStaticWallpaper(): boolean {
  if (useSystemSettingsStore.getState().batterySaver) {
    return true;
  }

  if (typeof navigator === "undefined") {
    return false;
  }

  const nav = navigator as CapabilityNavigator;

  if (nav.connection?.saveData) {
    return true;
  }

  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) {
    return true;
  }

  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 2) {
    return true;
  }

  return false;
}
