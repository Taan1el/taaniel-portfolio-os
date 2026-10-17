import { createShortcutNode } from "@/lib/shortcuts";
import type {
  DesktopGridPosition,
  FileSystemRecord,
  ShortcutTarget,
  VirtualDirectory,
} from "@/types/system";

/*
 * The desktop is the /Desktop folder (C:\Users\Taaniel\Desktop), exactly as
 * in Windows: every icon on it is a file, folder or .lnk shortcut there, and
 * File Explorer's Desktop shows the same items. The only extra icon is the
 * Recycle Bin, which Windows also draws as a system icon rather than a file.
 */

export const DESKTOP_PATH = "/Desktop";
/** Bump to place newly added default shortcuts on returning visitors' desktops. */
export const DESKTOP_SEED_VERSION = 1;
export const RECYCLE_BIN_DESKTOP_ID = "system:recycle-bin";
export const RECYCLE_BIN_DEFAULT_POSITION: DesktopGridPosition = { gridX: 2, gridY: 2 };

export interface DesktopShortcutSeed {
  /** Stored file name; the desktop hides the .lnk. */
  name: string;
  /** The DESKTOP_SEED_VERSION that added this shortcut. Defaults to 1, the first version. */
  since?: number;
  /** The id this icon had before the desktop was built from /Desktop. */
  legacyId: string;
  target: ShortcutTarget;
  defaultGridPosition: DesktopGridPosition;
}

export const desktopShortcutSeeds: DesktopShortcutSeed[] = [
  { name: "About.lnk", legacyId: "about-app", target: { type: "app", appId: "about" }, defaultGridPosition: { gridX: 0, gridY: 0 } },
  { name: "Projects.lnk", legacyId: "projects-app", target: { type: "app", appId: "projects" }, defaultGridPosition: { gridX: 0, gridY: 1 } },
  { name: "Contact.lnk", legacyId: "contact-app", target: { type: "app", appId: "contact" }, defaultGridPosition: { gridX: 0, gridY: 2 } },
  {
    name: "Resume.pdf.lnk",
    legacyId: "resume-file",
    target: { type: "path", path: "/Documents/Taaniel-Vananurm-CV.pdf" },
    defaultGridPosition: { gridX: 1, gridY: 0 },
  },
  {
    name: "OS Case Study.md.lnk",
    legacyId: "os-case-study",
    target: { type: "path", path: "/Portfolio/OS-Case-Study.md" },
    defaultGridPosition: { gridX: 2, gridY: 0 },
  },
  { name: "Photos.lnk", legacyId: "photos-app", target: { type: "app", appId: "photos" }, defaultGridPosition: { gridX: 1, gridY: 1 } },
  { name: "Browser.lnk", legacyId: "browser-app", target: { type: "app", appId: "browser" }, defaultGridPosition: { gridX: 2, gridY: 1 } },
  { name: "Portfolio.lnk", legacyId: "simple-portfolio", target: { type: "route", route: "/portfolio" }, defaultGridPosition: { gridX: 1, gridY: 2 } },
];

/** Desktop icon ids are the item's path, so a moved or renamed file gets a new icon. */
export function getDesktopNodeId(path: string) {
  return `desktop-node:${path}`;
}

export function getDesktopNodePath(id: string) {
  return id.startsWith("desktop-node:") ? id.slice("desktop-node:".length) : null;
}

/** Old desktop entry ids, from before persist version 6, mapped to today's ids. */
export const legacyDesktopIconIds: Record<string, string> = {
  ...Object.fromEntries(
    desktopShortcutSeeds.map((seed) => [seed.legacyId, getDesktopNodeId(`${DESKTOP_PATH}/${seed.name}`)])
  ),
  trash: RECYCLE_BIN_DESKTOP_ID,
};

/**
 * Re-key icon positions saved before the desktop was built from /Desktop. An
 * icon that already has a current-format position keeps it over a legacy one.
 */
export function remapLegacyDesktopIconIds(positions: Record<string, DesktopGridPosition>) {
  const remapped: Record<string, DesktopGridPosition> = {};

  Object.entries(positions).forEach(([id, position]) => {
    if (!(id in legacyDesktopIconIds)) {
      remapped[id] = position;
    }
  });

  Object.entries(positions).forEach(([id, position]) => {
    const nextId = legacyDesktopIconIds[id];

    if (nextId && !remapped[nextId]) {
      remapped[nextId] = position;
    }
  });

  return remapped;
}

export const initialDesktopIconPositions: Record<string, DesktopGridPosition> = {
  ...Object.fromEntries(
    desktopShortcutSeeds.map((seed) => [getDesktopNodeId(`${DESKTOP_PATH}/${seed.name}`), seed.defaultGridPosition])
  ),
  [RECYCLE_BIN_DESKTOP_ID]: RECYCLE_BIN_DEFAULT_POSITION,
};

/** Where a seeded item sits until the visitor moves it; anything else takes the first free cell. */
export function getDefaultDesktopPosition(id: string): DesktopGridPosition {
  return initialDesktopIconPositions[id] ?? { gridX: 0, gridY: 0 };
}

/**
 * Put the default shortcuts on the desktop once. The version marker on the
 * /Desktop folder records that this happened, so a shortcut the visitor
 * deletes stays deleted (Recycle Bin restore and Reset bring it back).
 */
export function ensureDesktopShortcuts(
  nodes: FileSystemRecord,
  timestamp = Date.now(),
  seeds: DesktopShortcutSeed[] = desktopShortcutSeeds,
  version = DESKTOP_SEED_VERSION
): FileSystemRecord {
  const desktop = nodes[DESKTOP_PATH];

  if (desktop && desktop.kind !== "directory") {
    return nodes;
  }

  const placedVersion = desktop?.desktopSeedVersion ?? 0;

  if (desktop && placedVersion >= version) {
    return nodes;
  }

  const next: FileSystemRecord = { ...nodes };
  const takenNames = new Set(
    Object.values(nodes)
      .filter((node) => node.path.startsWith(`${DESKTOP_PATH}/`) && !node.path.slice(DESKTOP_PATH.length + 1).includes("/"))
      .map((node) => node.name.toLowerCase())
  );

  seeds.forEach((seed) => {
    // Shortcuts from earlier versions were placed already; a visitor who deleted one keeps it deleted.
    if ((seed.since ?? 1) <= placedVersion || takenNames.has(seed.name.toLowerCase())) {
      return;
    }

    const path = `${DESKTOP_PATH}/${seed.name}`;
    next[path] = createShortcutNode(path, seed.target, timestamp);
  });

  const desktopNode: VirtualDirectory = desktop ?? {
    kind: "directory",
    path: DESKTOP_PATH,
    name: "Desktop",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  next[DESKTOP_PATH] = { ...desktopNode, desktopSeedVersion: version };
  return next;
}
