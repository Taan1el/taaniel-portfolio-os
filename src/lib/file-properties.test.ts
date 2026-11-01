// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describeProperties } from "@/lib/file-properties";
import type { FileSystemRecord, VirtualDirectory, VirtualFile } from "@/types/system";

const folder = (path: string): VirtualDirectory => ({ kind: "directory", path, name: path.split("/").pop() ?? "", createdAt: 1, updatedAt: 2 }) as VirtualDirectory;
const file = (path: string, extra: Partial<VirtualFile> = {}): VirtualFile =>
  ({ kind: "file", path, name: path.split("/").pop() ?? "", extension: "txt", mimeType: "text/plain", createdAt: 3, updatedAt: 4, ...extra }) as VirtualFile;

const nodes: FileSystemRecord = {
  "/": folder("/"),
  "/Work": folder("/Work"),
  "/Work/Deep": folder("/Work/Deep"),
  "/Work/a.txt": file("/Work/a.txt", { content: "hello" }),
  "/Work/Deep/b.txt": file("/Work/Deep/b.txt", { size: 100 }),
  "/Workshop": folder("/Workshop"),
  "/Workshop/c.txt": file("/Workshop/c.txt", { size: 9 }),
  "/fixed.txt": file("/fixed.txt", { size: 1, readonly: true }),
};

describe("properties", () => {
  it("describes one file", () => {
    expect(describeProperties(nodes, ["/Work/a.txt"])).toMatchObject({ name: "a.txt", location: "/Work", bytes: 5, files: 1, folders: 0, created: 3, modified: 4, readOnly: false });
  });

  it("adds up a folder, without being fooled by a similar name", () => {
    expect(describeProperties(nodes, ["/Work"])).toMatchObject({ bytes: 105, files: 2, folders: 2 });
  });

  it("does not count a child twice", () => {
    expect(describeProperties(nodes, ["/Work", "/Work/a.txt"])).toMatchObject({ name: "2 items", bytes: 105, files: 2 });
  });

  it("summarises several items", () => {
    const summary = describeProperties(nodes, ["/Work/a.txt", "/fixed.txt"]);

    expect(summary).toMatchObject({ name: "2 items", node: null, bytes: 6, location: null, created: null });
  });

  it("gives a shared location", () => {
    expect(describeProperties(nodes, ["/Work/a.txt", "/Work/Deep"])?.location).toBe("/Work");
  });

  it("reports read-only", () => {
    expect(describeProperties(nodes, ["/fixed.txt"])?.readOnly).toBe(true);
    expect(describeProperties(nodes, ["/Work"])?.readOnly).toBe(false);
  });

  it("ignores what no longer exists", () => {
    expect(describeProperties(nodes, ["/gone"])).toBeNull();
    expect(describeProperties(nodes, [])).toBeNull();
  });

  it("follows a shortcut", () => {
    const withLink = { ...nodes, "/link.lnk": file("/link.lnk", { shortcut: { type: "path", path: "/Work/a.txt" } as VirtualFile["shortcut"] }) };

    expect(describeProperties(withLink, ["/link.lnk"])?.target).toBe("/Work/a.txt");
  });
});
