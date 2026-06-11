/**
 * Heuristics for devices that should skip decorative GPU work.
 * The wallpaper pan/breathe loop runs forever, so constrained hardware
 * (low memory, few cores) or users on data-saver get the static gradient.
 */
interface CapabilityNavigator extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

export function prefersStaticWallpaper(): boolean {
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
