import { describe, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

import { RECYCLE_BIN_DESKTOP_ID, desktopShortcutSeeds, getDesktopNodeId } from "@/data/desktop-seed";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { buildDesktopEntries, findNeighborEntryId, orderEntriesByGrid, selectRange } from "@/lib/desktop-entries";
import { ensureSystemWorkspace } from "@/lib/system-workspace";
import type { DesktopGridPosition, VirtualFile } from "@/types/system";

const seeded = ensureSystemWorkspace(buildSeedFileSystem());

describe("buildDesktopEntries", () => {
  it("lists the seeded shortcuts and the Recycle Bin, without .lnk", () => {
    const entries = buildDesktopEntries(seeded);
    const labels = entries.map((entry) => entry.label);

    expect(entries).toHaveLength(desktopShortcutSeeds.length + 1);
    expect(labels).toEqual(expect.arrayContaining(["About", "Resume.pdf", "OS Case Study.md", "Portfolio", "Recycle Bin"]));
    expect(labels.some((label) => label.endsWith(".lnk"))).toBe(false);
  });

  it("keys items by their path and the Recycle Bin by its system id", () => {
    const entries = buildDesktopEntries(seeded);
    const about = entries.find((entry) => entry.label === "About");
    const bin = entries.find((entry) => entry.kind === "recycle-bin");

    expect(about).toMatchObject({ id: getDesktopNodeId("/Desktop/About.lnk"), kind: "node", path: "/Desktop/About.lnk" });
    expect(bin).toMatchObject({ id: RECYCLE_BIN_DESKTOP_ID, path: "/Trash" });
  });

  it("starts seeded items where they have always been and new files at the first free cell", () => {
    const file: VirtualFile = {
      kind: "file",
      path: "/Desktop/todo.txt",
      name: "todo.txt",
      extension: "txt",
      mimeType: "text/plain",
      content: "",
      createdAt: 1,
      updatedAt: 1,
    };
    const entries = buildDesktopEntries({ ...seeded, [file.path]: file });

    expect(entries.find((entry) => entry.label === "About")?.defaultGridPosition).toEqual({ gridX: 0, gridY: 0 });
    expect(entries.find((entry) => entry.label === "Resume.pdf")?.defaultGridPosition).toEqual({ gridX: 1, gridY: 0 });
    expect(entries.find((entry) => entry.label === "todo.txt")).toMatchObject({ label: "todo.txt", defaultGridPosition: { gridX: 0, gridY: 0 } });
  });

  it("follows the folder: a file that left /Desktop has no icon", () => {
    const { ["/Desktop/About.lnk"]: _removed, ...rest } = seeded;

    expect(buildDesktopEntries(rest).some((entry) => entry.label === "About")).toBe(false);
  });
});

describe("grid order and keyboard navigation", () => {
  const entries = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
  // Column 0: a, b. Column 1: c, d (with a gap). Column 3: e.
  const positions: Record<string, DesktopGridPosition> = {
    a: { gridX: 0, gridY: 0 },
    b: { gridX: 0, gridY: 1 },
    c: { gridX: 1, gridY: 0 },
    d: { gridX: 1, gridY: 2 },
    e: { gridX: 3, gridY: 1 },
  };

  it("walks down each column, then across", () => {
    expect(orderEntriesByGrid(entries, positions).map((entry) => entry.id)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("moves to the nearest icon in the direction pressed", () => {
    expect(findNeighborEntryId(entries, positions, "a", "down")).toBe("b");
    expect(findNeighborEntryId(entries, positions, "a", "right")).toBe("c");
    expect(findNeighborEntryId(entries, positions, "c", "down")).toBe("d");
    expect(findNeighborEntryId(entries, positions, "d", "up")).toBe("c");
    expect(findNeighborEntryId(entries, positions, "c", "left")).toBe("a");
  });

  it("stays in line when it can, and drifts to the next row or column when it can't", () => {
    // Nothing right of b in its row except e, which is in row 1.
    expect(findNeighborEntryId(entries, positions, "b", "right")).toBe("e");
    // Nothing above a, nothing left of a.
    expect(findNeighborEntryId(entries, positions, "a", "up")).toBeNull();
    expect(findNeighborEntryId(entries, positions, "a", "left")).toBeNull();
  });

  it("selects the range between two icons in grid order", () => {
    expect(selectRange(entries, positions, "b", "d")).toEqual(["b", "c", "d"]);
    expect(selectRange(entries, positions, "d", "b")).toEqual(["b", "c", "d"]);
    expect(selectRange(entries, positions, "missing", "d")).toEqual(["d"]);
  });
});
