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
  onToggleTheatre: () => void;
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
  onToggleTheatre,
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
        onCloseOverlays();
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

      if (event.key === "F11") {
        event.preventDefault();
        onToggleFullscreen();
        return;
      }

      if (event.shiftKey && event.key === "F10") {
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
        // Shift+T — toggle theatre mode (no modifier conflict, only fires outside inputs)
        if (event.shiftKey && (event.key === "T" || event.key === "t")) {
          event.preventDefault();
          onToggleTheatre();
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
    onToggleTheatre,
  ]);
}
