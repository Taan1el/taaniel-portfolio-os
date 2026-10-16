// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openFileSystemPath } from "@/lib/launchers";
import { registerShellNavigator } from "@/lib/shell-navigation";
import { createShortcutNode } from "@/lib/shortcuts";
import { useRecentFilesStore } from "@/stores/recent-files-store";
import { useToastStore } from "@/stores/toast-store";
import type { FileSystemRecord, VirtualDirectory, VirtualFile } from "@/types/system";

const dir = (path: string): VirtualDirectory => ({ kind: "directory", path, name: path.split("/").at(-1) || "/", createdAt: 1, updatedAt: 1 });
const pdf: VirtualFile = {
  kind: "file",
  path: "/Documents/CV.pdf",
  name: "CV.pdf",
  extension: "pdf",
  mimeType: "application/pdf",
  source: "/cv.pdf",
  createdAt: 1,
  updatedAt: 1,
};

const nodes: FileSystemRecord = {
  "/": dir("/"),
  "/Documents": dir("/Documents"),
  "/Documents/CV.pdf": pdf,
  "/Desktop": dir("/Desktop"),
  "/Desktop/About.lnk": createShortcutNode("/Desktop/About.lnk", { type: "app", appId: "about" }),
  "/Desktop/CV.pdf.lnk": createShortcutNode("/Desktop/CV.pdf.lnk", { type: "path", path: "/Documents/CV.pdf" }),
  "/Desktop/Docs.lnk": createShortcutNode("/Desktop/Docs.lnk", { type: "path", path: "/Documents" }),
  "/Desktop/Portfolio.lnk": createShortcutNode("/Desktop/Portfolio.lnk", { type: "route", route: "/portfolio" }),
  "/Desktop/Site.lnk": createShortcutNode("/Desktop/Site.lnk", { type: "url", url: "https://example.com/" }),
  "/Desktop/Gone.lnk": createShortcutNode("/Desktop/Gone.lnk", { type: "path", path: "/Documents/gone.txt" }),
};

beforeEach(() => {
  useRecentFilesStore.setState({ recentPaths: [] });
});

describe("opening shortcuts", () => {
  it("launches the app a shortcut points at", () => {
    const launchApp = vi.fn(() => "window");
    openFileSystemPath("/Desktop/About.lnk", nodes, launchApp);
    expect(launchApp).toHaveBeenCalledWith({ appId: "about" });
  });

  it("opens the target file and records the target in Recent", () => {
    const launchApp = vi.fn(() => "window");
    openFileSystemPath("/Desktop/CV.pdf.lnk", nodes, launchApp);

    expect(launchApp).toHaveBeenCalledWith({ appId: "pdf", payload: { filePath: "/Documents/CV.pdf" } });
    expect(useRecentFilesStore.getState().recentPaths).toEqual(["/Documents/CV.pdf"]);
  });

  it("opens a folder shortcut in File Explorer", () => {
    const launchApp = vi.fn(() => "window");
    openFileSystemPath("/Desktop/Docs.lnk", nodes, launchApp);
    expect(launchApp).toHaveBeenCalledWith({ appId: "files", payload: { directoryPath: "/Documents" } });
  });

  it("routes site pages through the shell navigator and web links to the Browser", () => {
    const launchApp = vi.fn(() => "window");
    const navigate = vi.fn();
    const unregister = registerShellNavigator(navigate);

    openFileSystemPath("/Desktop/Portfolio.lnk", nodes, launchApp);
    openFileSystemPath("/Desktop/Site.lnk", nodes, launchApp);
    unregister();

    expect(navigate).toHaveBeenCalledWith("/portfolio");
    expect(launchApp).toHaveBeenCalledWith({ appId: "browser", payload: { externalUrl: "https://example.com/" } });
  });

  it("explains a broken shortcut instead of opening anything", () => {
    const launchApp = vi.fn(() => "window");
    openFileSystemPath("/Desktop/Gone.lnk", nodes, launchApp);

    expect(launchApp).not.toHaveBeenCalled();
    expect(useToastStore.getState().toasts.at(-1)?.message).toMatch(/'gone\.txt' that this shortcut refers to has been changed or moved/);
  });
});
