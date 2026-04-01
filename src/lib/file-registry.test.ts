import { describe, expect, it } from "vitest";
import {
  getFileAssociationDescriptor,
  resolveEditApp,
  resolveOpenApp,
  supportsInlinePreview,
} from "@/lib/file-registry";

describe("file-registry", () => {
  it("resolves default open and edit apps for editable raster files", () => {
    const node = {
      kind: "file" as const,
      path: "/Media/Photography/Clouds.png",
      name: "Clouds.png",
      extension: "png",
      mimeType: "image/png",
      createdAt: 1,
      updatedAt: 1,
      source: "data:image/png;base64,abc",
    };

    expect(resolveOpenApp(node)).toBe("photos");
    expect(resolveEditApp(node)).toBe("paint");
  });

  it("keeps advanced image formats routed without claiming inline support", () => {
    const descriptor = getFileAssociationDescriptor("tiff");

    expect(descriptor?.openWith).toBe("photos");
    expect(descriptor?.editWith).toBeUndefined();
    expect(supportsInlinePreview("tiff")).toBe(false);
  });

  it("routes markdown to viewer on open and editor on edit", () => {
    const node = {
      kind: "file" as const,
      path: "/Users/Public/Blog/Frontend-Notes.md",
      name: "Frontend-Notes.md",
      extension: "md",
      mimeType: "text/markdown",
      createdAt: 1,
      updatedAt: 1,
      content: "# Notes",
    };

    expect(resolveOpenApp(node)).toBe("markdown");
    expect(resolveEditApp(node)).toBe("editor");
  });

  it("routes notes workspace files into the inline notes app", () => {
    const node = {
      kind: "file" as const,
      path: "/Documents/Notes/To-do list.txt",
      name: "To-do list.txt",
      extension: "txt",
      mimeType: "text/plain",
      createdAt: 1,
      updatedAt: 1,
      content: "Buy milk",
    };

    expect(resolveOpenApp(node)).toBe("notes");
    expect(resolveEditApp(node)).toBe("notes");
  });

  it("routes mp3 files into the music player", () => {
    const node = {
      kind: "file" as const,
      path: "/Media/Music/Studio Loop.mp3",
      name: "Studio Loop.mp3",
      extension: "mp3",
      mimeType: "audio/mpeg",
      createdAt: 1,
      updatedAt: 1,
      source: "/assets/studio-loop.mp3",
    };

    expect(resolveOpenApp(node)).toBe("music");
    expect(resolveEditApp(node)).toBeNull();
    expect(supportsInlinePreview("mp3")).toBe(true);
  });
});
