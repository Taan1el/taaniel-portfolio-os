import { WindowManager } from "@/components/shell/window-manager";
import type { AppWindow } from "@/types/system";

interface WindowHostProps {
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

export function WindowHost(props: WindowHostProps) {
  return <WindowManager {...props} />;
}
