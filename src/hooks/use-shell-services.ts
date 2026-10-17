import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { startDeviceWatchers } from "@/stores/device-store";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

/** Set as <html> attributes so plain CSS can react to a setting without a React tree. */
const FLAG_ATTRIBUTES = {
  reduceMotion: "data-reduce-motion",
  batterySaver: "data-battery-saver",
  nightLight: "data-night-light",
} as const;

type FlagName = keyof typeof FLAG_ATTRIBUTES;

function setFlag(root: HTMLElement, name: FlagName, enabled: boolean) {
  if (enabled) {
    root.setAttribute(FLAG_ATTRIBUTES[name], "true");
  } else {
    root.removeAttribute(FLAG_ATTRIBUTES[name]);
  }
}

/**
 * Background services of the shell, started once by the desktop:
 *  - the online, connection and battery watchers behind the tray,
 *  - the settings that plain CSS reacts to, mirrored onto <html> as
 *    data-reduce-motion, data-battery-saver and data-night-light.
 * Reading those settings here also renders the desktop again when one changes,
 * which it relies on to re-evaluate prefersStaticWallpaper() for battery saver.
 */
export function useShellServices() {
  const { reduceMotion, batterySaver, nightLight } = useSystemSettingsStore(
    useShallow((state) => ({
      reduceMotion: state.reduceMotion,
      batterySaver: state.batterySaver,
      nightLight: state.nightLight,
    }))
  );

  useEffect(() => startDeviceWatchers(), []);

  useEffect(() => {
    const root = document.documentElement;

    setFlag(root, "reduceMotion", reduceMotion);
    setFlag(root, "batterySaver", batterySaver);
    setFlag(root, "nightLight", nightLight);

    return () => {
      (Object.keys(FLAG_ATTRIBUTES) as FlagName[]).forEach((name) => setFlag(root, name, false));
    };
  }, [batterySaver, nightLight, reduceMotion]);
}
