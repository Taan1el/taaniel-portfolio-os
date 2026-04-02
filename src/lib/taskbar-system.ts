import { getAppDefinition } from "@/lib/app-registry";
import type { AppProcess, AppWindow, TaskbarWindowEntry } from "@/types/system";

export function buildTaskbarWindowEntries(
  processes: AppProcess[],
  windows: AppWindow[]
): TaskbarWindowEntry[] {
  const windowsByProcessId = new Map(windows.map((windowState) => [windowState.processId, windowState]));

  return processes
    .filter((process) => windowsByProcessId.has(process.id))
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((process) => {
      const windowState = windowsByProcessId.get(process.id);

      if (!windowState) {
        return null;
      }

      const definition = getAppDefinition(process.appId);
      const active = process.status === "focused";

      return {
        id: process.id,
        processId: process.id,
        windowId: windowState.id,
        appId: process.appId,
        title: windowState.title,
        active,
        minimized: windowState.minimized,
        preview: {
          title: windowState.title,
          subtitle: definition.title,
          status: windowState.minimized ? "minimized" : active ? "active" : "background",
        },
      };
    })
    .filter((entry): entry is TaskbarWindowEntry => Boolean(entry));
}
