import { describe, expect, it } from "vitest";
import { buildTaskbarWindowEntries } from "@/lib/taskbar-system";
import type { AppProcess, AppWindow } from "@/types/system";

describe("taskbar-system", () => {
  it("creates stable taskbar entries with preview metadata", () => {
    const windows: AppWindow[] = [
      {
        id: "window-a",
        processId: "process-a",
        appId: "about",
        title: "About",
        minimized: false,
        maximized: false,
        focused: true,
        zIndex: 5,
        x: 10,
        y: 10,
        width: 800,
        height: 600,
        createdAt: 1,
        processStatus: "focused",
      },
      {
        id: "window-b",
        processId: "process-b",
        appId: "projects",
        title: "Projects",
        minimized: true,
        maximized: false,
        focused: false,
        zIndex: 4,
        x: 20,
        y: 20,
        width: 800,
        height: 600,
        createdAt: 2,
        processStatus: "minimized",
      },
    ];
    const processes: AppProcess[] = [
      {
        id: "process-a",
        appId: "about",
        status: "focused",
        launchPayload: undefined,
        createdAt: 1,
      },
      {
        id: "process-b",
        appId: "projects",
        status: "minimized",
        launchPayload: undefined,
        createdAt: 2,
      },
    ];
    const entries = buildTaskbarWindowEntries(processes, windows);

    expect(entries).toHaveLength(2);
    expect(entries[0].active).toBe(true);
    expect(entries[0].windowId).toBe("window-a");
    expect(entries[0].preview.status).toBe("active");
    expect(entries[1].minimized).toBe(true);
    expect(entries[1].preview.status).toBe("minimized");
  });
});
