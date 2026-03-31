import { getAppDefinition } from "@/lib/app-registry";
import type { AppWindow, TaskbarWindowEntry } from "@/types/system";

export function buildTaskbarWindowEntries(
  windows: AppWindow[],
  activeWindowId: string | null
): TaskbarWindowEntry[] {
  return [...windows]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((windowState) => {
      const definition = getAppDefinition(windowState.appId);
      const active = activeWindowId === windowState.id && !windowState.minimized;

      return {
        id: windowState.id,
        appId: windowState.appId,
        title: windowState.title,
        active,
        minimized: windowState.minimized,
        preview: {
          title: windowState.title,
          subtitle: definition.title,
          status: windowState.minimized ? "minimized" : active ? "active" : "background",
        },
      };
    });
}
