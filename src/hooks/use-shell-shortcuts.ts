import { useEffect } from "react";

interface UseShellShortcutsOptions {
  activeWindowId: string | null;
  onCloseOverlays: () => void;
  onToggleStartMenu: () => void;
  onToggleSearch: () => void;
  onCloseActiveWindow: (windowId: string) => void;
  onOpenTerminal: () => void;
  onToggleFullscreen: () => void;
  onOpenStartMenuWithLauncherKey: () => void;
}

function isLauncherMetaKey(event: KeyboardEvent) {
  return (
    (event.key === "Meta" ||
      event.key === "OS" ||
      event.code === "MetaLeft" ||
      event.code === "MetaRight") &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey
  );
}

export function useShellShortcuts({
  activeWindowId,
  onCloseOverlays,
  onToggleStartMenu,
  onToggleSearch,
  onCloseActiveWindow,
  onOpenTerminal,
  onToggleFullscreen,
  onOpenStartMenuWithLauncherKey,
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

      if (isLauncherMetaKey(event) && !event.repeat) {
        event.preventDefault();
        onOpenStartMenuWithLauncherKey();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && loweredKey === "k") {
        event.preventDefault();
        onToggleSearch();
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeWindowId,
    onCloseActiveWindow,
    onCloseOverlays,
    onOpenStartMenuWithLauncherKey,
    onOpenTerminal,
    onToggleFullscreen,
    onToggleSearch,
    onToggleStartMenu,
  ]);
}
