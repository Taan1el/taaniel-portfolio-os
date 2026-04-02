import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { WindowManager } from "@/components/shell/window-manager";
import { buildAppWindows } from "@/stores/system-runtime";
import { useProcessStore } from "@/stores/process-store";
import { useSystemStore } from "@/stores/system-store";
import { useWindowStore } from "@/stores/window-store";

export function WindowHost() {
  const { rawWindows } = useWindowStore(
    useShallow((state) => ({
      rawWindows: state.windows,
    }))
  );
  const { processes } = useProcessStore(
    useShallow((state) => ({
      processes: state.processes,
    }))
  );
  const {
    focusWindow,
    closeWindow,
    toggleMinimize,
    toggleMaximize,
    updateWindowBounds,
  } = useSystemStore(
    useShallow((state) => ({
      focusWindow: state.focusWindow,
      closeWindow: state.closeWindow,
      toggleMinimize: state.toggleMinimize,
      toggleMaximize: state.toggleMaximize,
      updateWindowBounds: state.updateWindowBounds,
    }))
  );

  const windows = useMemo(() => buildAppWindows(rawWindows, processes), [processes, rawWindows]);

  return (
    <WindowManager
      windows={windows}
      onFocusWindow={focusWindow}
      onCloseWindow={closeWindow}
      onMinimizeWindow={toggleMinimize}
      onMaximizeWindow={toggleMaximize}
      onWindowBoundsChange={updateWindowBounds}
    />
  );
}
