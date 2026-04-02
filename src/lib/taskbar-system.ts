import { getAppDefinition } from "@/lib/app-registry";
import type { AppProcess, AppWindow, TaskbarWindowEntry } from "@/types/system";

export function buildTaskbarWindowEntries(
  processes: AppProcess[],
  windows: AppWindow[]
): TaskbarWindowEntry[] {
  const windowsById = new Map(windows.map((windowState) => [windowState.id, windowState]));
  const windowedProcesses = processes.filter(
    (process): process is AppProcess & { windowId: string } =>
      typeof process.windowId === "string" && windowsById.has(process.windowId)
  );

  return windowedProcesses
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((process) => {
      const windowState = windowsById.get(process.windowId);

      if (!windowState) {
        return null;
      }

      const definition = getAppDefinition(process.appId);
      const active = process.status === "focused";

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
