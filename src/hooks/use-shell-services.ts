import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { ACHIEVEMENTS, unlockAchievement } from "@/stores/achievements-store";
import { startDeviceWatchers } from "@/stores/device-store";
import { useProcessStore } from "@/stores/process-store";
import { useShellStore } from "@/stores/shell-store";
import { useWindowStore } from "@/stores/window-store";
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
  const { reduceMotion, batterySaver, nightLight, textSize, moreContrast } = useSystemSettingsStore(
    useShallow((state) => ({
      textSize: state.textSize,
      moreContrast: state.moreContrast,
      reduceMotion: state.reduceMotion,
      batterySaver: state.batterySaver,
      nightLight: state.nightLight,
    }))
  );

  useEffect(() => startDeviceWatchers(), []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--os-text-zoom", String(textSize / 100));
    if (moreContrast) root.setAttribute("data-contrast", "more");
    else root.removeAttribute("data-contrast");
    return () => {
      root.style.removeProperty("--os-text-zoom");
      root.removeAttribute("data-contrast");
    };
  }, [moreContrast, textSize]);

  // Achievements that come from using the OS rather than from one place in the code.
  useEffect(() => {
    const unwatchApps = useProcessStore.subscribe(({ processes }) => {
      for (const achievement of ACHIEVEMENTS) {
        if (achievement.app && processes.some((process) => process.appId === achievement.app)) unlockAchievement(achievement.id);
      }
    });
    const unwatchDesktops = useWindowStore.subscribe(({ desktopCount }) => {
      if (desktopCount > 1) unlockAchievement("desktops");
    });
    const unwatchTheme = useShellStore.subscribe(({ themeId }) => {
      if (themeId === "retro-95") unlockAchievement("retro");
    });
    return () => {
      unwatchApps();
      unwatchDesktops();
      unwatchTheme();
    };
  }, []);

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
