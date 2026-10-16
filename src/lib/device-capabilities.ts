/**
 * Heuristics for devices that should skip decorative GPU work.
 * The wallpaper pan/breathe loop runs forever, so constrained hardware
 * (low memory, few cores) or users on data-saver get the static gradient.
 * Battery saver, which the visitor can switch on from Quick Settings, does too.
 */
interface CapabilityNavigator extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

interface StaticWallpaperOptions {
  /** The visitor's own Battery saver switch. */
  batterySaver?: boolean;
}

export function prefersStaticWallpaper({ batterySaver = false }: StaticWallpaperOptions = {}): boolean {
  if (batterySaver) {
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
