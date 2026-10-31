import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

import {
  DESKTOP_SEED_VERSION,
  desktopShortcutSeeds,
  ensureDesktopShortcuts,
  getDesktopNodeId,
  initialDesktopIconPositions,
  legacyDesktopIconIds,
  RECYCLE_BIN_DESKTOP_ID,
  remapLegacyDesktopIconIds,
} from "@/data/desktop-seed";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { ensureSystemWorkspace, TRASH_PATH } from "@/lib/system-workspace";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { VirtualDirectory } from "@/types/system";

const store = () => useFileSystemStore.getState();

beforeEach(() => {
  useFileSystemStore.setState({ nodes: ensureSystemWorkspace(buildSeedFileSystem()), initialized: true });
});

describe("desktop seeding", () => {
  it("puts the default shortcuts in /Desktop once", () => {
    const nodes = store().nodes;
    const names = Object.values(nodes)
      .filter((node) => node.path.startsWith("/Desktop/"))
      .map((node) => node.name)
      .sort();

    expect(names).toEqual(desktopShortcutSeeds.map((seed) => seed.name).sort());
    expect((nodes["/Desktop"] as VirtualDirectory).desktopSeedVersion).toBe(DESKTOP_SEED_VERSION);
    expect(nodes["/Desktop/About.lnk"]).toMatchObject({ kind: "file", extension: "lnk", shortcut: { type: "app", appId: "about" } });
    expect(nodes["/Desktop/Resume.pdf.lnk"]).toMatchObject({
      shortcut: { type: "path", path: "/Documents/Taaniel-Vananurm-CV.pdf" },
    });
  });

  it("does not bring back a shortcut the visitor deleted", async () => {
    await store().deleteNode("/Desktop/About.lnk");
    await store().deleteNodePermanently(`${TRASH_PATH}/About.lnk`);

    const next = ensureSystemWorkspace(store().nodes);
    expect(next["/Desktop/About.lnk"]).toBeUndefined();
  });

  it("restores a deleted shortcut from the Recycle Bin", async () => {
    await store().deleteNode("/Desktop/Photos.lnk");
    const restored = await store().restoreNode(`${TRASH_PATH}/Photos.lnk`);

    expect(restored).toBe("/Desktop/Photos.lnk");
    expect(store().nodes["/Desktop/Photos.lnk"]).toMatchObject({ shortcut: { type: "app", appId: "photos" } });
  });

  it("seeds returning visitors without overwriting their own files", () => {
    const legacy = buildSeedFileSystem();
    legacy["/Desktop/About.lnk"] = {
      kind: "file",
      path: "/Desktop/About.lnk",
      name: "About.lnk",
      extension: "lnk",
      mimeType: "text/plain",
      content: "mine",
      createdAt: 1,
      updatedAt: 1,
    };

    const seeded = ensureDesktopShortcuts(legacy);
    expect(seeded["/Desktop/About.lnk"]).toMatchObject({ content: "mine" });
    expect(seeded["/Desktop/Projects.lnk"]).toBeTruthy();
    expect(ensureDesktopShortcuts(seeded)).toBe(seeded);
  });

  it("adds only the shortcuts a newer seed version introduces", async () => {
    await store().deleteNode("/Desktop/About.lnk");
    await store().deleteNodePermanently(`${TRASH_PATH}/About.lnk`);

    const notes = {
      name: "Notes.lnk",
      since: 3,
      legacyId: "notes-app",
      target: { type: "app" as const, appId: "notes" as const },
      defaultGridPosition: { gridX: 3, gridY: 0 },
    };
    const next = ensureDesktopShortcuts(store().nodes, 5, [...desktopShortcutSeeds, notes], 3);

    expect(next["/Desktop/Notes.lnk"]).toMatchObject({ shortcut: { type: "app", appId: "notes" } });
    // The shortcut the visitor deleted stays deleted, and the folder remembers it is up to date.
    expect(next["/Desktop/About.lnk"]).toBeUndefined();
    expect((next["/Desktop"] as VirtualDirectory).desktopSeedVersion).toBe(3);
    expect(ensureDesktopShortcuts(next, 6, [...desktopShortcutSeeds, notes], 3)).toBe(next);
  });

  it("recreates a missing Desktop folder with its shortcuts", () => {
    const nodes = { ...store().nodes };
    Object.keys(nodes).forEach((path) => {
      if (path === "/Desktop" || path.startsWith("/Desktop/")) delete nodes[path];
    });

    const repaired = ensureSystemWorkspace(nodes);

    expect(repaired["/Desktop"]).toMatchObject({ kind: "directory" });
    expect(repaired["/Desktop/About.lnk"]).toBeTruthy();
  });

  it("maps every legacy icon id onto a seeded item", () => {
    expect(legacyDesktopIconIds["about-app"]).toBe(getDesktopNodeId("/Desktop/About.lnk"));
    expect(legacyDesktopIconIds.trash).toBe(RECYCLE_BIN_DESKTOP_ID);
    Object.values(legacyDesktopIconIds).forEach((id) => {
      expect(initialDesktopIconPositions[id]).toBeTruthy();
    });
  });

  it("re-keys saved icon positions from the old ids", () => {
    const remapped = remapLegacyDesktopIconIds({
      "about-app": { gridX: 5, gridY: 1 },
      trash: { gridX: 9, gridY: 2 },
      "desktop-node:/Desktop/notes.txt": { gridX: 3, gridY: 3 },
    });

    expect(remapped).toEqual({
      [getDesktopNodeId("/Desktop/About.lnk")]: { gridX: 5, gridY: 1 },
      [RECYCLE_BIN_DESKTOP_ID]: { gridX: 9, gridY: 2 },
      "desktop-node:/Desktop/notes.txt": { gridX: 3, gridY: 3 },
    });
  });

  it("prefers a current-format position over a legacy one for the same icon", () => {
    const newId = getDesktopNodeId("/Desktop/About.lnk");
    const remapped = remapLegacyDesktopIconIds({
      "about-app": { gridX: 1, gridY: 1 },
      [newId]: { gridX: 4, gridY: 4 },
    });

    expect(remapped[newId]).toEqual({ gridX: 4, gridY: 4 });
    expect(remapped["about-app"]).toBeUndefined();
  });
});

describe("protected system folders", () => {
  it("can't be deleted, renamed or moved, only copied", async () => {
    await store().deleteNode("/Desktop");
    expect(store().nodes["/Desktop"]).toBeTruthy();

    await store().deleteNodePermanently("/Documents");
    expect(store().nodes["/Documents"]).toBeTruthy();

    expect(await store().rename("/Desktop", "Elsewhere")).toBe("/Desktop");
    expect(store().nodes["/Elsewhere"]).toBeUndefined();

    // The folders the apps depend on are locked too.
    for (const path of ["/Documents/Notes", "/Media", "/Media/Music", "/Media/Photography", "/Portfolio", "/Trash"]) {
      expect(store().canCutNode(path)).toBe(false);
      // eslint-disable-next-line no-await-in-loop
      expect(await store().rename(path, "Elsewhere")).toBe(path);
    }

    expect(store().canCutNode("/Desktop")).toBe(false);
    expect(store().canCutNode("/Desktop/About.lnk")).toBe(true);

    await store().pasteNode("/Desktop", "/Documents", "copy", { quiet: true });
    expect(store().nodes["/Documents/Desktop/About.lnk"]).toBeTruthy();
  });
});
