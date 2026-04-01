import { getAppDefinition } from "@/lib/app-registry";
import type { AppProcess, AppWindow, ProcessState, TaskbarWindowEntry } from "@/types/system";

function resolveProcessState(windowState: AppWindow, activeWindowId: string | null): ProcessState {
  if (windowState.minimized) {
    return "minimized";
  }

  if (activeWindowId === windowState.id) {
    return "focused";
  }

  return "running";
}

export function buildProcessesFromWindows(
  windows: AppWindow[],
  activeWindowId: string | null
): AppProcess[] {
  return [...windows]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((windowState) => ({
      id: windowState.processId,
      appId: windowState.appId,
      windowId: windowState.id,
      title: windowState.title,
      state: resolveProcessState(windowState, activeWindowId),
      payload: windowState.payload,
      createdAt: windowState.createdAt,
    }));
}

export function buildTaskbarWindowEntries(
  processes: AppProcess[],
  windows: AppWindow[]
): TaskbarWindowEntry[] {
  const windowsById = new Map(windows.map((windowState) => [windowState.id, windowState]));

  return processes
    .filter((process) => windowsById.has(process.windowId))
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((process) => {
      const windowState = windowsById.get(process.windowId);

      if (!windowState) {
        return null;
      }

      const definition = getAppDefinition(process.appId);
      const active = process.state === "focused";

      return {
        id: process.id,
        processId: process.id,
        windowId: process.windowId,
        appId: process.appId,
        title: process.title,
        active,
        minimized: windowState.minimized,
        preview: {
          title: process.title,
          subtitle: definition.title,
          status: windowState.minimized ? "minimized" : active ? "active" : "background",
        },
      };
    })
    .filter((entry): entry is TaskbarWindowEntry => Boolean(entry));
}
