// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PREVIEW_TEXT_LIMIT, describePreview } from "@/lib/file-preview";
import type { FileSystemRecord, VirtualDirectory, VirtualFile } from "@/types/system";

const folder = (path: string) => ({ kind: "directory", path, name: path.split("/").pop(), createdAt: 1, updatedAt: 1 }) as VirtualDirectory;
const file = (path: string, extra: Partial<VirtualFile>) =>
  ({ kind: "file", path, name: path.split("/").pop(), extension: path.split(".").pop(), mimeType: "", createdAt: 1, updatedAt: 1, ...extra }) as VirtualFile;

const nodes: FileSystemRecord = {
  "/": folder("/"),
  "/Docs": folder("/Docs"),
  "/Docs/a.txt": file("/Docs/a.txt", { content: "hello" }),
  "/Docs/b.html": file("/Docs/b.html", { content: "<script>alert(1)</script>" }),
  "/big.txt": file("/big.txt", { content: "x".repeat(PREVIEW_TEXT_LIMIT + 5) }),
  "/pic.png": file("/pic.png", { source: "data:image/png;base64,AAAA" }),
  "/nopic.png": file("/nopic.png", {}),
  "/song.mp3": file("/song.mp3", { source: "/assets/song.mp3" }),
  "/film.mp4": file("/film.mp4", { source: "/assets/film.mp4" }),
  "/doc.pdf": file("/doc.pdf", { source: "/assets/doc.pdf" }),
  "/link.lnk": file("/link.lnk", { shortcut: { type: "path", path: "/pic.png" } as VirtualFile["shortcut"] }),
  "/dead.lnk": file("/dead.lnk", { shortcut: { type: "path", path: "/gone.png" } as VirtualFile["shortcut"] }),
};

describe("file preview", () => {
  it("is empty with nothing selected", () => {
    expect(describePreview(nodes, []).kind).toBe("empty");
    expect(describePreview(nodes, ["/gone"]).kind).toBe("empty");
  });

  it("counts a multi-selection", () => {
    expect(describePreview(nodes, ["/pic.png", "/Docs"])).toEqual({ kind: "many", count: 2 });
  });

  it("counts what is in a folder", () => {
    expect(describePreview(nodes, ["/Docs"])).toMatchObject({ kind: "folder", items: 2 });
  });

  it("shows text", () => {
    expect(describePreview(nodes, ["/Docs/a.txt"])).toMatchObject({ kind: "text", text: "hello", truncated: false });
  });

  it("keeps markup as text", () => {
    expect(describePreview(nodes, ["/Docs/b.html"])).toMatchObject({ kind: "text", text: "<script>alert(1)</script>" });
  });

  it("cuts long text short and says so", () => {
    const preview = describePreview(nodes, ["/big.txt"]);

    expect(preview).toMatchObject({ kind: "text", truncated: true });
    expect(preview.kind === "text" && preview.text.length).toBe(PREVIEW_TEXT_LIMIT);
  });

  it("shows images, sound and video from their source", () => {
    expect(describePreview(nodes, ["/pic.png"]).kind).toBe("image");
    expect(describePreview(nodes, ["/song.mp3"]).kind).toBe("audio");
    expect(describePreview(nodes, ["/film.mp4"]).kind).toBe("video");
  });

  it("offers nothing where it has nothing to show", () => {
    expect(describePreview(nodes, ["/nopic.png"]).kind).toBe("none");
    expect(describePreview(nodes, ["/doc.pdf"]).kind).toBe("none");
  });

  it("previews what a shortcut points at", () => {
    expect(describePreview(nodes, ["/link.lnk"])).toMatchObject({ kind: "image", node: { path: "/pic.png" } });
  });

  it("flags a broken shortcut", () => {
    expect(describePreview(nodes, ["/dead.lnk"])).toMatchObject({ kind: "none", broken: true });
  });
});
