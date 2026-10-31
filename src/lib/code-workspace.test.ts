import { describe, expect, it } from "vitest";
import {
  buildPreviewDocument,
  childrenForTree,
  isEditableFile,
  isTabDirty,
  languageForExtension,
  nextActiveAfterClose,
  openTab,
  previewKind,
  quickOpenMatches,
  searchFiles,
} from "@/lib/code-workspace";
import type { FileSystemRecord, VirtualNode } from "@/types/system";

function file(path: string, content?: string, extra: Partial<VirtualNode> = {}): VirtualNode {
  return {
    kind: "file",
    path,
    name: path.split("/").pop() ?? path,
    extension: path.split(".").pop() ?? "",
    mimeType: "text/plain",
    createdAt: 0,
    updatedAt: 0,
    content,
    ...extra,
  } as VirtualNode;
}

const nodes = Object.fromEntries(
  [
    { kind: "directory", path: "/", name: "", createdAt: 0, updatedAt: 0 } as VirtualNode,
    { kind: "directory", path: "/Site", name: "Site", createdAt: 0, updatedAt: 0 } as VirtualNode,
    { kind: "directory", path: "/Trash", name: "Trash", createdAt: 0, updatedAt: 0 } as VirtualNode,
    file("/Site/index.html", '<link rel="stylesheet" href="a.css"><script src="b.js"></script><img src="https://x.test/a.png">'),
    file("/Site/a.css", "body{color:red}"),
    file("/Site/b.js", "alert(1)"),
    file("/Site/notes.md", "first line\nfind ME here"),
    file("/Trash/old.txt", "find me"),
    file("/photo.png", undefined, { source: "/x.png" }),
    file("/Desktop/About.lnk", "", { shortcut: { type: "app", appId: "about" } }),
  ].map((node) => [node.path, node])
) as FileSystemRecord;

describe("code workspace", () => {
  it("maps languages and preview kinds", () => {
    expect(languageForExtension("TSX")).toBe("typescript");
    expect(languageForExtension("zzz")).toBe("plaintext");
    expect(previewKind("/a/index.HTML")).toBe("html");
    expect(previewKind("/a/readme.md")).toBe("markdown");
    expect(previewKind("/a/a.js")).toBeNull();
  });

  it("only treats text files outside the bin as editable", () => {
    expect(isEditableFile(nodes["/Site/a.css"])).toBe(true);
    expect(isEditableFile(nodes["/photo.png"])).toBe(false);
    expect(isEditableFile(nodes["/Desktop/About.lnk"])).toBe(false);
    expect(isEditableFile(nodes["/Trash/old.txt"])).toBe(false);
  });

  it("opens each file once, tracks unsaved text and picks the next tab", () => {
    const tabs = openTab(openTab([], "/a", "1"), "/b", "2");
    expect(openTab(tabs, "/a", "changed")).toBe(tabs);
    expect(isTabDirty(tabs[0])).toBe(false);
    expect(isTabDirty({ ...tabs[0], value: "edited" })).toBe(true);
    expect(nextActiveAfterClose(tabs, "/a", "/a")).toBe("/b");
    expect(nextActiveAfterClose(tabs, "/b", "/b")).toBe("/a");
    expect(nextActiveAfterClose(tabs, "/b", "/a")).toBe("/a");
    expect(nextActiveAfterClose(tabs.slice(0, 1), "/a", "/a")).toBeNull();
  });

  it("quick opens by letters in order and skips non-text", () => {
    expect(quickOpenMatches(nodes, "idx").map((match) => match.name)).toEqual(["index.html"]);
    expect(quickOpenMatches(nodes, "photo")).toEqual([]);
  });

  it("searches file contents, case-insensitively, outside the bin", () => {
    expect(searchFiles(nodes, "find me")).toEqual([{ path: "/Site/notes.md", line: 2, text: "find ME here" }]);
    expect(searchFiles(nodes, "f")).toEqual([]);
  });

  it("hides the bin and shortcuts from the tree", () => {
    expect(childrenForTree(nodes, "/").map((node) => node.name)).toEqual(["Site", "photo.png"]);
  });

  it("inlines workspace files into a locked-down preview", () => {
    const html = nodes["/Site/index.html"];
    const page = buildPreviewDocument("/Site/index.html", (html as { content: string }).content, nodes);
    expect(page).toContain("<style>body{color:red}</style>");
    expect(page).toContain("<script>alert(1)</script>");
    expect(page).toContain("Content-Security-Policy");
    expect(page).toContain("default-src 'none'");
    expect(page).toContain("https://x.test/a.png");
  });

  it("uses unsaved text and cannot break out of an inlined tag", () => {
    const page = buildPreviewDocument("/Site/index.html", '<link rel="stylesheet" href="a.css">', nodes, () => "a{}</style><script>evil()</script>");
    expect(page).not.toContain("</style><script>evil");
  });
});
