import { useEffect } from "react";

interface UseShellShortcutsOptions {
  activeWindowId: string | null;
  onCloseOverlays: () => void;
  onToggleStartMenu: () => void;
  onOpenLauncherSearch: () => void;
  onCloseActiveWindow: (windowId: string) => void;
  onOpenTerminal: () => void;
  onToggleFullscreen: () => void;
  onToggleCheatsheet: () => void;
  onSnapActiveWindow: (direction: "left" | "right" | "up" | "down") => void;
  onSwitchDesktop: (step: 1 | -1) => void;
}

export function useShellShortcuts({
  activeWindowId,
  onCloseOverlays,
  onToggleStartMenu,
  onOpenLauncherSearch,
  onCloseActiveWindow,
  onOpenTerminal,
  onToggleFullscreen,
  onToggleCheatsheet,
  onSnapActiveWindow,
  onSwitchDesktop,
}: UseShellShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const loweredKey = event.key.toLowerCase();

      if (event.shiftKey && event.key === "Escape") {
        event.preventDefault();
        onToggleStartMenu();
        return;
      }

      if (event.key === "Escape") {
        // Layered surfaces such as Start claim Escape first.
        if (!event.defaultPrevented) onCloseOverlays();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && loweredKey === "k") {
        event.preventDefault();
        onOpenLauncherSearch();
        return;
      }

      if (event.altKey && event.key === "F4" && activeWindowId) {
        event.preventDefault();
        onCloseActiveWindow(activeWindowId);
        return;
      }

      if (event.altKey && event.shiftKey && event.key.startsWith("Arrow") && activeWindowId) {
        event.preventDefault();
        onSnapActiveWindow(event.key.slice(5).toLowerCase() as "left" | "right" | "up" | "down");
        return;
      }

      if (event.ctrlKey && event.altKey && !event.getModifierState?.("AltGraph") && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        onSwitchDesktop(event.key === "ArrowRight" ? 1 : -1);
        return;
      }

      // Alt+F4 usually closes the browser on Windows, so this is the dependable one.
      if (event.altKey && event.shiftKey && event.code === "KeyW" && activeWindowId) {
        event.preventDefault();
        onCloseActiveWindow(activeWindowId);
        return;
      }

      if (event.key === "F11") {
        event.preventDefault();
        onToggleFullscreen();
        return;
      }

      // AltGr reports as Ctrl+Alt on Windows, so it must not count here.
      if (event.ctrlKey && event.altKey && event.code === "KeyT" && !event.getModifierState?.("AltGraph")) {
        event.preventDefault();
        onOpenTerminal();
        return;
      }

      // ? key (no modifier) or Ctrl+/ — open cheatsheet
      const target = event.target as HTMLElement | null;
      const inInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (!inInput) {
        if (event.key === "?" && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          onToggleCheatsheet();
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key === "/") {
          event.preventDefault();
          onToggleCheatsheet();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeWindowId,
    onCloseActiveWindow,
    onCloseOverlays,
    onOpenTerminal,
    onToggleFullscreen,
    onOpenLauncherSearch,
    onToggleStartMenu,
    onToggleCheatsheet,
    onSnapActiveWindow,
    onSwitchDesktop,
  ]);
}
