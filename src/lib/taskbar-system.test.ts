import { describe, expect, it } from "vitest";
import { buildTaskbarWindowEntries } from "@/lib/taskbar-system";

describe("taskbar-system", () => {
  it("creates stable taskbar entries with preview metadata", () => {
    const entries = buildTaskbarWindowEntries(
      [
        {
          id: "window-a",
          appId: "about",
          title: "About",
          minimized: false,
          maximized: false,
          zIndex: 5,
          x: 10,
          y: 10,
          width: 800,
          height: 600,
          createdAt: 1,
        },
        {
          id: "window-b",
          appId: "projects",
          title: "Projects",
          minimized: true,
          maximized: false,
          zIndex: 4,
          x: 20,
          y: 20,
          width: 800,
          height: 600,
          createdAt: 2,
        },
      ],
      "window-a"
    );

    expect(entries).toHaveLength(2);
    expect(entries[0].active).toBe(true);
    expect(entries[0].preview.status).toBe("active");
    expect(entries[1].minimized).toBe(true);
    expect(entries[1].preview.status).toBe("minimized");
  });
});
