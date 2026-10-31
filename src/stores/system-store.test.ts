// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { ensureSystemWorkspace } from "@/lib/system-workspace";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useProcessStore } from "@/stores/process-store";
import { useRecentFilesStore } from "@/stores/recent-files-store";
import { useSystemStore } from "@/stores/system-store";
import { useWindowStore } from "@/stores/window-store";

const CV = "/Documents/Taaniel-Vananurm-CV.pdf";
const PHOTO = "/Media/Photography/Austria Mountains.jpg";

const windows = () => useSystemStore.getState().windows;
const windowById = (id: string) => windows().find((entry) => entry.id === id);

beforeEach(() => {
  useWindowStore.setState({ windows: [], activeWindowId: null, nextZ: 2 });
  useProcessStore.getState().resetProcesses();
  useRecentFilesStore.setState({ recentPaths: [] });
  const nodes = ensureSystemWorkspace(buildSeedFileSystem());
  useFileSystemStore.setState({ nodes, initialized: true });
});

describe("openFileInWindow (a file dropped on a window)", () => {
  it("makes a viewer switch to the dropped file instead of opening another window", () => {
    const other = useSystemStore.getState().launchApp({ appId: "pdf", payload: { filePath: CV } });
    const photos = useSystemStore.getState().launchApp({ appId: "photos" });

    useSystemStore.getState().openFileInWindow(photos, PHOTO);

    expect(windows()).toHaveLength(2);
    expect(windowById(photos)?.payload?.filePath).toBe(PHOTO);
    expect(windowById(photos)?.title).toContain("Austria Mountains");
    expect(windowById(other)?.payload?.filePath).toBe(CV);
    expect(useSystemStore.getState().focusedWindowId).toBe(photos);
  });

  it("follows a shortcut to the file it points at", () => {
    const id = useSystemStore.getState().launchApp({ appId: "pdf" });

    useSystemStore.getState().openFileInWindow(id, "/Desktop/Resume.pdf.lnk");

    expect(windows()).toHaveLength(1);
    expect(windowById(id)?.payload?.filePath).toBe(CV);
  });

  it("adds a tab in Code, so unsaved text is never replaced", async () => {
    await useFileSystemStore.getState().writeFile("/Desktop/a.txt", "first", { mimeType: "text/plain", extension: "txt" });
    await useFileSystemStore.getState().writeFile("/Desktop/b.txt", "second", { mimeType: "text/plain", extension: "txt" });
    const id = useSystemStore.getState().launchApp({ appId: "editor", payload: { filePath: "/Desktop/a.txt" } });

    useSystemStore.getState().openFileInWindow(id, "/Desktop/b.txt");

    expect(windows()).toHaveLength(1);
    expect(windowById(id)?.payload?.filePath).toBe("/Desktop/b.txt");
  });

  it("remembers the file as recent", () => {
    const id = useSystemStore.getState().launchApp({ appId: "photos" });

    useSystemStore.getState().openFileInWindow(id, PHOTO);

    expect(useRecentFilesStore.getState().recentPaths).toContain(PHOTO);
  });

  it("ignores a path that is not a file", () => {
    const id = useSystemStore.getState().launchApp({ appId: "photos" });
    const before = windowById(id)?.payload;

    useSystemStore.getState().openFileInWindow(id, "/Media/Photography");
    useSystemStore.getState().openFileInWindow(id, "/nowhere.jpg");

    expect(windows()).toHaveLength(1);
    expect(windowById(id)?.payload).toEqual(before);
  });
});
