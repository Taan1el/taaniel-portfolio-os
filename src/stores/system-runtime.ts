import { desktopEntries, themePresets } from "@/data/portfolio";
import { getAppDefinition } from "@/lib/app-registry";
import { LEGACY_WELCOME_PATH } from "@/lib/system-workspace";
import { clamp, createId } from "@/lib/utils";
import type {
  AppId,
  AppProcess,
  AppWindow,
  DesktopEntry,
  DesktopGridPosition,
  ProcessState,
  ViewportMode,
  WindowBounds,
  WindowPayload,
  WindowRecord,
} from "@/types/system";

export const LEGACY_SYSTEM_STORAGE_KEY = "taaniel-os-system-v1";
export const WINDOW_STORAGE_KEY = "taaniel-os-windows-v1";
export const PROCESS_STORAGE_KEY = "taaniel-os-processes-v1";
export const SHELL_STORAGE_KEY = "taaniel-os-shell-v1";

const TASKBAR_HEIGHT = 72;
const REMOVED_GAME_APP_IDS = new Set(["snake", "tetris"]);

export const initialIconPositions = desktopEntries.reduce<Record<string, DesktopGridPosition>>(
  (positions, entry) => {
    positions[entry.id] = entry.defaultGridPosition;
    return positions;
  },
  {}
);

interface LegacyWindowState extends Partial<WindowRecord> {
  appId?: AppId;
  title?: string;
  payload?: WindowPayload;
}

interface LegacySystemState {
  windows?: LegacyWindowState[];
  activeWindowId?: string | null;
  nextZ?: number;
  themeId?: string;
  customWallpaperSource?: string | null;
  desktopIconPositions?: Record<string, DesktopGridPosition>;
}

interface LegacyPersistedState {
  state?: LegacySystemState;
}

function readLegacySystemState() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(LEGACY_SYSTEM_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as LegacyPersistedState;
    return parsed.state ?? null;
  } catch {
    return null;
  }
}

export function getDesktopHeight() {
  if (typeof window === "undefined") {
    return 720 - TASKBAR_HEIGHT - 18;
  }

  return Math.max(480, window.innerHeight - TASKBAR_HEIGHT - 18);
}

export function isCompactViewport() {
  return typeof window !== "undefined" && window.innerWidth < 820;
}

export function getViewportMode(): ViewportMode {
  return isCompactViewport() ? "mobile" : "desktop";
}

export function getMaximizedBounds() {
  if (typeof window === "undefined") {
    return { x: 12, y: 12, width: 1200, height: getDesktopHeight() };
  }

  return {
    x: 12,
    y: 12,
    width: window.innerWidth - 24,
    height: getDesktopHeight(),
  };
}

export function clampWindowBoundsToViewport(windowState: Pick<WindowBounds, "x" | "y" | "width" | "height">) {
  if (typeof window === "undefined") {
    return {
      x: windowState.x,
      y: windowState.y,
      width: windowState.width,
      height: windowState.height,
    };
  }

  const desktopHeight = getDesktopHeight();
  const width = clamp(windowState.width, 360, Math.max(360, window.innerWidth - 24));
  const height = clamp(windowState.height, 280, Math.max(280, desktopHeight));

  return {
    width,
    height,
    x: clamp(windowState.x, 8, Math.max(8, window.innerWidth - width - 8)),
    y: clamp(windowState.y, 8, Math.max(8, desktopHeight - height + 8)),
  };
}

export function getDefaultWindowBounds(appId: AppId, index: number) {
  const definition = getAppDefinition(appId);
  const compactViewport = isCompactViewport();

  if (compactViewport && definition.mobileMaximized !== false) {
    return getMaximizedBounds();
  }

  if (typeof window === "undefined") {
    return {
      x: definition.defaultPosition?.x ?? 120,
      y: definition.defaultPosition?.y ?? 88,
      width: definition.defaultSize.width,
      height: definition.defaultSize.height,
    };
  }

  const desktopHeight = getDesktopHeight();
  const minWidth = definition.minSize?.width ?? 360;
  const minHeight = definition.minSize?.height ?? 280;
  const maxWidth = Math.min(window.innerWidth - 44, Math.floor(window.innerWidth * 0.84));
  const maxHeight = Math.min(desktopHeight - 16, Math.floor(desktopHeight * 0.82));
  const width = clamp(Math.min(definition.defaultSize.width, maxWidth), minWidth, maxWidth);
  const height = clamp(Math.min(definition.defaultSize.height, maxHeight), minHeight, maxHeight);
  const slotColumns = Math.max(1, Math.min(4, Math.floor((window.innerWidth - 80) / 260)));
  const slotRows = Math.max(1, Math.min(3, Math.floor((desktopHeight - 72) / 180)));
  const slotIndex = index % (slotColumns * slotRows);
  const slotX = slotIndex % slotColumns;
  const slotY = Math.floor(slotIndex / slotColumns);
  const availableX = Math.max(0, window.innerWidth - width - 40);
  const availableY = Math.max(0, desktopHeight - height - 28);
  const cascadedX =
    slotColumns > 1 ? 20 + Math.round((availableX / Math.max(1, slotColumns - 1)) * slotX) : 28;
  const cascadedY =
    slotRows > 1 ? 20 + Math.round((availableY / Math.max(1, slotRows - 1)) * slotY) : 24;
  const baseX = Math.max(cascadedX, definition.defaultPosition?.x ?? 28);
  const baseY = Math.max(cascadedY, definition.defaultPosition?.y ?? 24);

  return clampWindowBoundsToViewport({
    x: clamp(baseX, 20, Math.max(20, window.innerWidth - width - 12)),
    y: clamp(baseY, 20, Math.max(20, desktopHeight - height + 16)),
    width,
    height,
  });
}

export function getTopVisibleWindowId(windows: WindowRecord[]) {
  return [...windows]
    .filter((windowState) => !windowState.minimized)
    .sort((a, b) => b.zIndex - a.zIndex)[0]?.id ?? null;
}

function resolveProcessStatus(
  windowState: WindowRecord | undefined,
  activeWindowId: string | null
): ProcessState {
  if (!windowState) {
    return "running";
  }

  if (windowState.minimized) {
    return "minimized";
  }

  if (windowState.id === activeWindowId) {
    return "focused";
  }

  return "running";
}

export function syncProcessStatuses(
  windows: WindowRecord[],
  processes: AppProcess[]
) {
  const windowsByProcessId = new Map(windows.map((windowState) => [windowState.processId, windowState]));

  return processes.map((process) => {
    const linkedWindow = windowsByProcessId.get(process.id);

    return {
      ...process,
      status: resolveProcessStatus(linkedWindow, linkedWindow?.focused ? linkedWindow.id : null),
    };
  });
}

export function buildAppWindows(
  windows: WindowRecord[],
  processes: AppProcess[]
): AppWindow[] {
  const processesById = new Map(processes.map((process) => [process.id, process]));
  const appWindows: AppWindow[] = [];

  windows.forEach((windowState) => {
    const process = processesById.get(windowState.processId);

    if (!process) {
      return;
    }

    appWindows.push({
      ...windowState,
      appId: process.appId,
      payload: process.launchPayload,
      processStatus: process.status,
    });
  });

  return appWindows;
}

function sanitizeLegacyWindows(windows: LegacyWindowState[]) {
  return windows
    .filter((windowState) => windowState.id && windowState.processId)
    .filter((windowState) => windowState.payload?.filePath !== LEGACY_WELCOME_PATH)
    .filter((windowState) => !REMOVED_GAME_APP_IDS.has(String(windowState.appId)))
    .map<WindowRecord>((windowState) => {
      const legacyAppId = windowState.appId ?? "about";
      const fallbackBounds = getDefaultWindowBounds(windowState.appId ?? "about", 0);
      const clampedBounds = clampWindowBoundsToViewport({
        x: typeof windowState.x === "number" ? windowState.x : fallbackBounds.x,
        y: typeof windowState.y === "number" ? windowState.y : fallbackBounds.y,
        width: typeof windowState.width === "number" ? windowState.width : fallbackBounds.width,
        height: typeof windowState.height === "number" ? windowState.height : fallbackBounds.height,
      });
      const restoreBounds = windowState.restoreBounds
        ? clampWindowBoundsToViewport(windowState.restoreBounds)
        : undefined;

      return {
        id: windowState.id ?? createId("window"),
        processId: windowState.processId ?? createId("process"),
        title:
          windowState.title ??
          getAppDefinition(legacyAppId).resolveTitle?.(windowState.payload) ??
          getAppDefinition(legacyAppId).title,
        minimized: Boolean(windowState.minimized),
        minimizedByShowDesktop: Boolean(windowState.minimizedByShowDesktop),
        maximized: Boolean(windowState.maximized),
        focused: false,
        zIndex: typeof windowState.zIndex === "number" ? windowState.zIndex : 2,
        createdAt: typeof windowState.createdAt === "number" ? windowState.createdAt : Date.now(),
        restoreBounds,
        ...clampedBounds,
      };
    });
}

function buildLegacyProcesses(
  windows: LegacyWindowState[],
  activeWindowId: string | null
) {
  const processes: AppProcess[] = [];

  sanitizeLegacyWindows(windows).forEach((windowState) => {
    const legacyWindow = windows.find((item) => item.id === windowState.id);

    if (!legacyWindow?.appId) {
      return;
    }

    processes.push({
      id: windowState.processId,
      appId: legacyWindow.appId,
      status: resolveProcessStatus(windowState, activeWindowId),
      launchPayload: legacyWindow.payload,
      createdAt: windowState.createdAt,
    });
  });

  return processes;
}

export function getLegacyWindowSeed() {
  const legacyState = readLegacySystemState();
  const windows = sanitizeLegacyWindows(legacyState?.windows ?? []);
  const activeWindowId =
    legacyState?.activeWindowId && windows.some((windowState) => windowState.id === legacyState.activeWindowId)
      ? legacyState.activeWindowId
      : getTopVisibleWindowId(windows);
  const nextZ =
    typeof legacyState?.nextZ === "number"
      ? legacyState.nextZ
      : windows.reduce((highest, windowState) => Math.max(highest, windowState.zIndex), 2);

  return {
    windows,
    activeWindowId,
    nextZ,
  };
}

export function getLegacyProcessSeed() {
  const legacyState = readLegacySystemState();
  return buildLegacyProcesses(legacyState?.windows ?? [], legacyState?.activeWindowId ?? null);
}

export function getLegacyShellSeed() {
  const legacyState = readLegacySystemState();
  const themeId =
    themePresets.find((preset) => preset.id === legacyState?.themeId)?.id ?? themePresets[0].id;

  return {
    themeId,
    customWallpaperSource: legacyState?.customWallpaperSource ?? null,
    desktopIconPositions: legacyState?.desktopIconPositions ?? initialIconPositions,
  };
}

export function resolveWindowProcessStatus(windows: WindowRecord[], activeWindowId: string | null, processId: string) {
  return resolveProcessStatus(windows.find((windowState) => windowState.processId === processId), activeWindowId);
}

export function createProcessFromApp(appId: AppId, payload?: WindowPayload): AppProcess {
  return {
    id: createId("process"),
    appId,
    status: "running",
    launchPayload: payload,
    createdAt: Date.now(),
  };
}

export function resolveWindowTitle(appId: AppId, payload?: WindowPayload, titleOverride?: string) {
  if (titleOverride) {
    return titleOverride;
  }

  const definition = getAppDefinition(appId);
  return definition.resolveTitle?.(payload) ?? definition.title;
}

export function launchPayloadsMatch(
  currentPayload?: WindowPayload,
  nextPayload?: WindowPayload
) {
  if (!currentPayload && !nextPayload) {
    return true;
  }

  if (!currentPayload || !nextPayload) {
    return false;
  }

  return (
    currentPayload.filePath === nextPayload.filePath &&
    currentPayload.directoryPath === nextPayload.directoryPath &&
    currentPayload.projectId === nextPayload.projectId &&
    currentPayload.externalUrl === nextPayload.externalUrl &&
    currentPayload.title === nextPayload.title
  );
}

export function getRuntimeEntryByDesktopId(entries: DesktopEntry[], entryId: string) {
  return entries.find((entry) => entry.id === entryId) ?? null;
}
