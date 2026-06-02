import { describe, expect, it } from "vitest";
import { resolveLocalBrowserDocument } from "@/lib/browser/local-file";
import type { FileSystemRecord, VirtualDirectory, VirtualFile } from "@/types/system";

const root: VirtualDirectory = {
  kind: "directory",
  path: "/",
  name: "/",
  createdAt: 1,
  updatedAt: 1,
};

function imageFile(source: string): VirtualFile {
  return {
    kind: "file",
    path: "/Media/photo.png",
    name: "photo.png",
    mimeType: "image/png",
    extension: "png",
    source,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("local browser file previews", () => {
  it("renders safe media sources inside local srcDoc previews", () => {
    const nodes: FileSystemRecord = {
      "/": root,
      "/Media/photo.png": imageFile("data:image/png;base64,AAAA"),
    };

    const result = resolveLocalBrowserDocument("/Media/photo.png", nodes);

    expect(result.error).toBeNull();
    expect(result.document?.frameSource.kind).toBe("srcDoc");
    expect(result.document?.frameSource.value).toContain("data:image/png;base64,AAAA");
  });

  it("rejects unsafe media source schemes from corrupted filesystem records", () => {
    const nodes: FileSystemRecord = {
      "/": root,
      "/Media/photo.png": imageFile("javascript:alert(1)"),
    };

    const result = resolveLocalBrowserDocument("/Media/photo.png", nodes);

    expect(result.document).toBeNull();
    expect(result.error).toBe("photo.png cannot be rendered inside the Browser app.");
  });
});
