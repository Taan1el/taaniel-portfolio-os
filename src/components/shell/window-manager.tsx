import { AnimatePresence } from "framer-motion";
import { WindowFrame } from "@/components/shell/window-frame";
import { desktopOf } from "@/stores/window-store";
import type { AppWindow } from "@/types/system";

interface WindowManagerProps {
  windows: AppWindow[];
  activeDesktop: number;
  onFocusWindow: (windowId: string) => void;
  onCloseWindow: (windowId: string) => void;
  onMinimizeWindow: (windowId: string) => void;
  onMaximizeWindow: (windowId: string) => void;
  onWindowBoundsChange: (
    windowId: string,
    nextBounds: Pick<AppWindow, "x" | "y" | "width" | "height">
  ) => void;
}

export function WindowManager({
  windows,
  activeDesktop,
  onFocusWindow,
  onCloseWindow,
  onMinimizeWindow,
  onMaximizeWindow,
  onWindowBoundsChange,
}: WindowManagerProps) {
  return (
    <div className="window-manager">
      <AnimatePresence initial={false} mode="popLayout">
        {windows
          .filter((windowState) => !windowState.minimized)
          .map((windowState) => (
            <WindowFrame
              key={windowState.id}
              window={windowState}
              active={windowState.focused}
              // Hidden, not unmounted: apps on another desktop keep running.
              hidden={desktopOf(windowState) !== activeDesktop}
              onFocus={() => onFocusWindow(windowState.id)}
              onClose={() => onCloseWindow(windowState.id)}
              onMinimize={() => onMinimizeWindow(windowState.id)}
              onMaximize={() => onMaximizeWindow(windowState.id)}
              onBoundsChange={(nextBounds) => onWindowBoundsChange(windowState.id, nextBounds)}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}
