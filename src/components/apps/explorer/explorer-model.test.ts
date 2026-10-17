import { describe, expect, it } from "vitest";
import {
  buildBreadcrumbs,
  formatDetailsSize,
  formatSize,
  getNodeLabel,
  getNodeSize,
  getSearchText,
  selectPathRange,
  sortExplorerNodes,
} from "@/components/apps/explorer/explorer-model";
import type { FileNode } from "@/types/system";

const file = (name: string, extra: Partial<FileNode> = {}): FileNode => ({
  path: `/Desktop/${name}`,
  name,
  type: "file",
  extension: name.split(".").pop(),
  createdAt: 1,
  updatedAt: 1,
  ...extra,
});
const folder = (name: string): FileNode => ({ path: `/Desktop/${name}`, name, type: "folder", createdAt: 1, updatedAt: 1 });

describe("labels", () => {
  it("hides .lnk the way Windows does", () => {
    expect(getNodeLabel(file("About.lnk"))).toBe("About");
    expect(getNodeLabel(file("Resume.pdf.lnk"))).toBe("Resume.pdf");
    expect(getNodeLabel(file("notes.txt"))).toBe("notes.txt");
    expect(getNodeLabel(folder("Stuff.lnk"))).toBe("Stuff.lnk");
  });

  it("searches by the shown name", () => {
    expect(getSearchText(file("About.lnk"))).toContain("about ");
    expect(getSearchText(file("About.lnk", { mimeType: "application/x-shortcut" }))).toContain("shortcut");
  });
});

describe("sortExplorerNodes", () => {
  const nodes = [file("b.txt"), folder("Zeta"), file("A.txt"), folder("alpha"), file("file10.txt"), file("file2.txt")];

  it("puts folders first and sorts names naturally, ignoring case", () => {
    expect(sortExplorerNodes(nodes, "name", "asc").map((node) => node.name)).toEqual([
      "alpha",
      "Zeta",
      "A.txt",
      "b.txt",
      "file2.txt",
      "file10.txt",
    ]);
  });

  it("keeps folders on top when the order is reversed", () => {
    expect(sortExplorerNodes(nodes, "name", "desc").map((node) => node.name)).toEqual([
      "Zeta",
      "alpha",
      "file10.txt",
      "file2.txt",
      "b.txt",
      "A.txt",
    ]);
  });

  it("sorts shortcuts by what is shown, not by .lnk", () => {
    const shortcuts = [file("Zed.lnk"), file("Apple.lnk"), file("Mid.lnk")];

    expect(sortExplorerNodes(shortcuts, "name", "asc").map(getNodeLabel)).toEqual(["Apple", "Mid", "Zed"]);
  });

  it("sorts by size using text length when no size is recorded", () => {
    const sized = [file("big.txt", { content: "x".repeat(500) }), file("small.txt", { content: "x" }), file("mid.txt", { size: 200 })];

    expect(sortExplorerNodes(sized, "size", "asc").map((node) => node.name)).toEqual(["small.txt", "mid.txt", "big.txt"]);
  });

  it("sorts the Recycle Bin's date column by when items were deleted", () => {
    const deleted = [file("a.txt", { updatedAt: 1, deletedAt: 300 }), file("b.txt", { updatedAt: 999, deletedAt: 100 })];

    expect(sortExplorerNodes(deleted, "date", "asc").map((node) => node.name)).toEqual(["b.txt", "a.txt"]);
  });
});

describe("sizes and paths", () => {
  it("reads the best size available", () => {
    expect(getNodeSize({ size: 12 })).toBe(12);
    expect(getNodeSize({ content: "hello" })).toBe(5);
    expect(getNodeSize({ source: "data:text/plain;base64,aGVsbG8=" })).toBe(5);
    expect(getNodeSize({})).toBe(0);
  });

  it("formats sizes for the status bar and the Details column", () => {
    expect(formatSize(512)).toBe("512 bytes");
    expect(formatSize(2048)).toBe("2.00 KB");
    expect(formatSize(0)).toBe("");
    expect(formatDetailsSize(12)).toBe("1 KB");
    expect(formatDetailsSize(1024)).toBe("1 KB");
    expect(formatDetailsSize(1025)).toBe("2 KB");
  });

  it("builds breadcrumbs from the profile folder down", () => {
    expect(buildBreadcrumbs("/")).toEqual([{ label: "Taaniel", path: "/" }]);
    expect(buildBreadcrumbs("/Documents/Reports")).toEqual([
      { label: "Taaniel", path: "/" },
      { label: "Documents", path: "/Documents" },
      { label: "Reports", path: "/Documents/Reports" },
    ]);
  });
});

describe("selectPathRange", () => {
  const ordered = ["a", "b", "c", "d", "e"];

  it("selects everything between the anchor and the target, either way round", () => {
    expect(selectPathRange(ordered, "b", "d")).toEqual(["b", "c", "d"]);
    expect(selectPathRange(ordered, "d", "b")).toEqual(["b", "c", "d"]);
  });

  it("falls back to the target alone without a usable anchor", () => {
    expect(selectPathRange(ordered, null, "c")).toEqual(["c"]);
    expect(selectPathRange(ordered, "missing", "c")).toEqual(["c"]);
    expect(selectPathRange(ordered, "a", "missing")).toEqual(["missing"]);
  });
});