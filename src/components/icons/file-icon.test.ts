import { describe, expect, it } from "vitest";
import { BrowserIcon, FileIcon, FolderIcon, PdfIcon, PortfolioIcon } from "@/components/icons/apps";
import { describeFileType, getShortcutIcon } from "@/components/icons/file-icon";
import { getAppDefinition } from "@/lib/app-registry";
import { createShortcutNode } from "@/lib/shortcuts";
import type { FileSystemRecord, ShortcutTarget, VirtualNode } from "@/types/system";

const nodes: FileSystemRecord = {
  "/Documents": { kind: "directory", path: "/Documents", name: "Documents", createdAt: 1, updatedAt: 1 },
  "/Documents/cv.pdf": {
    kind: "file",
    path: "/Documents/cv.pdf",
    name: "cv.pdf",
    extension: "pdf",
    mimeType: "application/pdf",
    createdAt: 1,
    updatedAt: 1,
  },
  "/Desktop/CV.lnk": createShortcutNode("/Desktop/CV.lnk", { type: "path", path: "/Documents/cv.pdf" }),
};

const icon = (shortcut: ShortcutTarget, record: FileSystemRecord = nodes) => getShortcutIcon(shortcut, record);

describe("getShortcutIcon", () => {
  it("shows the app a shortcut runs", () => {
    expect(icon({ type: "app", appId: "about" })).toBe(getAppDefinition("about").icon);
  });

  it("shows the icon of the file or folder it points at", () => {
    expect(icon({ type: "path", path: "/Documents/cv.pdf" })).toBe(PdfIcon);
    expect(icon({ type: "path", path: "/Documents" })).toBe(FolderIcon);
  });

  it("follows a shortcut that points at another shortcut", () => {
    expect(icon({ type: "path", path: "/Desktop/CV.lnk" })).toBe(PdfIcon);
  });

  it("draws a broken shortcut as a plain file", () => {
    expect(icon({ type: "path", path: "/Documents/gone.pdf" })).toBe(FileIcon);
    expect(icon({ type: "app", appId: "not-an-app" } as unknown as ShortcutTarget)).toBe(FileIcon);
  });

  it("gives the quick portfolio page its own mark, not the Browser's", () => {
    expect(icon({ type: "route", route: "/portfolio" })).toBe(PortfolioIcon);
    expect(icon({ type: "url", url: "https://example.com" })).toBe(BrowserIcon);
  });

  it("gives up on a shortcut loop instead of spinning", () => {
    const loop: Record<string, VirtualNode> = {
      "/a.lnk": createShortcutNode("/a.lnk", { type: "path", path: "/b.lnk" }),
      "/b.lnk": createShortcutNode("/b.lnk", { type: "path", path: "/a.lnk" }),
    };

    expect(icon({ type: "path", path: "/a.lnk" }, loop)).toBe(FileIcon);
  });
});

describe("describeFileType", () => {
  it("calls a .lnk a Shortcut", () => {
    expect(describeFileType({ path: "/Desktop/About.lnk", type: "file", extension: "lnk" })).toBe("Shortcut");
  });
});
