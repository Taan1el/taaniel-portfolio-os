import { AnimatePresence } from "framer-motion";
import { WindowFrame } from "@/components/shell/window-frame";
import type { AppWindow } from "@/types/system";

interface WindowManagerProps {
  windows: AppWindow[];
  activeWindowId: string | null;
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
  activeWindowId,
  onFocusWindow,
  onCloseWindow,
  onMinimizeWindow,
  onMaximizeWindow,
  onWindowBoundsChange,
}: WindowManagerProps) {
  return (
    <div className="window-manager">
      <AnimatePresence>
        {windows
          .filter((windowState) => !windowState.minimized)
          .map((windowState) => (
            <WindowFrame
              key={windowState.id}
              window={windowState}
              active={windowState.id === activeWindowId}
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
