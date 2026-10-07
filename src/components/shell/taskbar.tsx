import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { toPng } from "html-to-image";
import { BatteryFull, Volume2, Wifi } from "lucide-react";
import { SearchInput } from "@/components/apps/app-layout";
import { LogoMark } from "@/components/ui/logo-mark";
import type { ShellSearchResultsHandle } from "@/components/shell/shell-search-results";
import { getAppDefinition } from "@/lib/app-registry";
import { cn, formatClock } from "@/lib/utils";
import taskbarMod from "@/components/shell/taskbar.module.css";
import { useShellStore } from "@/stores/shell-store";
import type { AppId, TaskbarWindowEntry, WindowPayload } from "@/types/system";

const TASKBAR_PREVIEW_WIDTH = 256;
const TASKBAR_PREVIEW_OFFSET = 12;
const PREVIEW_FALLBACK_APPS = new Set<AppId>(["browser", "dino", "doom", "editor", "hextris", "paint", "terminal", "v86"]);
/** How long a captured window preview stays fresh before hover re-captures it. */
const PREVIEW_CACHE_TTL_MS = 5000;

function getPreviewPlacement(button: HTMLButtonElement) {
  const buttonRect = button.getBoundingClientRect();
  const left = Math.max(
    16,
    Math.min(
      buttonRect.left + buttonRect.width / 2 - TASKBAR_PREVIEW_WIDTH / 2,
      window.innerWidth - TASKBAR_PREVIEW_WIDTH - 16
    )
  );
  return { left, bottom: window.innerHeight - buttonRect.top + TASKBAR_PREVIEW_OFFSET };
}

/** Tray date the way Windows prints it: numeric, in the visitor's locale (6.10.2026, 10/6/2026, ...). */
function formatTrayDate(date: Date) {
  return new Intl.DateTimeFormat([], { day: "numeric", month: "numeric", year: "numeric" }).format(date);
}

// ── Slot model ────────────────────────────────────────────────────
type TaskbarSlot =
  | { type: "pinned-closed"; appId: AppId }
  | { type: "window"; entry: TaskbarWindowEntry; pinned: boolean };

function buildSlots(pinnedAppIds: AppId[], entries: TaskbarWindowEntry[]): TaskbarSlot[] {
  const slots: TaskbarSlot[] = [];
  const usedWindowIds = new Set<string>();

  for (const appId of pinnedAppIds) {
    const match =
      entries.find((e) => e.appId === appId && e.active) ??
      entries.find((e) => e.appId === appId);

    if (match) {
      slots.push({ type: "window", entry: match, pinned: true });
      usedWindowIds.add(match.windowId);
    } else {
      slots.push({ type: "pinned-closed", appId });
    }
  }

  for (const entry of entries) {
    if (!usedWindowIds.has(entry.windowId)) {
      slots.push({ type: "window", entry, pinned: false });
    }
  }

  return slots;
}

// ── Jump list menu ────────────────────────────────────────────────
interface JumpListMenu {
  appId: AppId;
  windowId?: string;      // set when opened from an active window button
  pinned: boolean;
  left: number;
  bottom: number;
}

function getJumpListPlacement(button: HTMLButtonElement) {
  const rect = button.getBoundingClientRect();
  return {
    left: Math.max(8, Math.min(rect.left, window.innerWidth - 220 - 8)),
    bottom: window.innerHeight - rect.top + 6,
  };
}

// ──────────────────────────────────────────────────────────────────
interface TaskbarPreviewEntry extends TaskbarWindowEntry {
  left: number;
  bottom: number;
}

interface TaskbarProps {
  entries: TaskbarWindowEntry[];
  pinnedAppIds: AppId[];
  startMenuOpen: boolean;
  calendarOpen: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchFieldFocus: () => void;
  searchBrowseRef: RefObject<ShellSearchResultsHandle | null>;
  onToggleStartMenu: () => void;
  onToggleCalendar: () => void;
  onToggleWindow: (windowId: string) => void;
  onLaunchApp: (appId: AppId, payload?: WindowPayload) => void;
  onCloseWindow: (windowId: string) => void;
  onPinApp: (appId: AppId) => void;
  onUnpinApp: (appId: AppId) => void;
  onShowDesktop: () => void;
}

export function Taskbar({
  entries,
  pinnedAppIds,
  startMenuOpen,
  calendarOpen,
  searchQuery,
  onSearchQueryChange,
  onSearchFieldFocus,
  searchBrowseRef,
  onToggleStartMenu,
  onToggleCalendar,
  onToggleWindow,
  onLaunchApp,
  onCloseWindow,
  onPinApp,
  onUnpinApp,
  onShowDesktop,
}: TaskbarProps) {
  const [now, setNow] = useState(() => new Date());
  const [previewEntry, setPreviewEntry] = useState<TaskbarPreviewEntry | null>(null);
  const [previewImages, setPreviewImages] = useState<Record<string, string | null>>({});
  const [jumpListMenu, setJumpListMenu] = useState<JumpListMenu | null>(null);
  const windowsRef = useRef<HTMLDivElement | null>(null);
  const captureQueueRef = useRef<Set<string>>(new Set());
  const captureTimestampsRef = useRef<Map<string, number>>(new Map());
  const taskbarSearchInputRef = useRef<HTMLInputElement>(null);
  const startMenuSearchFocusNonce = useShellStore((state) => state.startMenuSearchFocusNonce);
  const searching = searchQuery.trim().length > 0;

  const slots = buildSlots(pinnedAppIds, entries);

  useEffect(() => {
    if (startMenuSearchFocusNonce > 0) {
      taskbarSearchInputRef.current?.focus();
    }
  }, [startMenuSearchFocusNonce]);

  const handleTaskbarSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onSearchQueryChange("");
      return;
    }
    if (searching) {
      searchBrowseRef.current?.handleSearchKeyDown(event);
    }
  };

  // Tick on the minute boundary, so the tray clock never lags a real one.
  useEffect(() => {
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      setNow(new Date());
      intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (previewEntry && !entries.some((entry) => entry.id === previewEntry.id)) {
      setPreviewEntry(null);
    }
  }, [entries, previewEntry]);

  useEffect(() => {
    if (!previewEntry) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".w11-taskbar__app") || target.closest(".taskbar__preview")) return;
      setPreviewEntry(null);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [previewEntry]);

  useEffect(() => {
    if (!jumpListMenu) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".taskbar__jump-list")) return;
      setJumpListMenu(null);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [jumpListMenu]);

  useEffect(() => {
    const activeWindowIds = new Set(entries.map((entry) => entry.windowId));
    for (const windowId of captureTimestampsRef.current.keys()) {
      if (!activeWindowIds.has(windowId)) {
        captureTimestampsRef.current.delete(windowId);
      }
    }
    setPreviewImages((current) => {
      const nextEntries = Object.entries(current).filter(([windowId]) => activeWindowIds.has(windowId));
      if (nextEntries.length === Object.keys(current).length) return current;
      return Object.fromEntries(nextEntries);
    });
  }, [entries]);

  useEffect(() => {
    if (!previewEntry) return;
    const syncPreviewPosition = () => {
      const activeButton = windowsRef.current?.querySelector<HTMLButtonElement>(
        `[data-window-id="${previewEntry.windowId}"]`
      );
      if (!activeButton) { setPreviewEntry(null); return; }
      const placement = getPreviewPlacement(activeButton);
      setPreviewEntry((current) => (current ? { ...current, ...placement } : current));
    };
    window.addEventListener("resize", syncPreviewPosition);
    window.addEventListener("scroll", syncPreviewPosition, true);
    return () => {
      window.removeEventListener("resize", syncPreviewPosition);
      window.removeEventListener("scroll", syncPreviewPosition, true);
    };
  }, [previewEntry]);

  const capturePreview = async (entry: TaskbarWindowEntry) => {
    if (entry.minimized || PREVIEW_FALLBACK_APPS.has(entry.appId) || captureQueueRef.current.has(entry.windowId)) {
      setPreviewImages((current) => ({ ...current, [entry.windowId]: null }));
      captureTimestampsRef.current.delete(entry.windowId);
      return;
    }
    const capturedAt = captureTimestampsRef.current.get(entry.windowId);
    if (capturedAt !== undefined && Date.now() - capturedAt < PREVIEW_CACHE_TTL_MS) {
      return;
    }
    captureQueueRef.current.add(entry.windowId);
    try {
      const node = document.querySelector<HTMLElement>(`[data-window-preview-id="${entry.windowId}"]`);
      if (!node || node.querySelector("iframe, canvas, .xterm")) {
        setPreviewImages((current) => ({ ...current, [entry.windowId]: null }));
        return;
      }
      const image = await toPng(node, { cacheBust: true, pixelRatio: 0.7, skipFonts: true, backgroundColor: "#09101a" });
      captureTimestampsRef.current.set(entry.windowId, Date.now());
      setPreviewImages((current) => ({ ...current, [entry.windowId]: image }));
    } catch {
      setPreviewImages((current) => ({ ...current, [entry.windowId]: null }));
    } finally {
      captureQueueRef.current.delete(entry.windowId);
    }
  };

  const previewNode =
    typeof document !== "undefined"
      ? createPortal(
          <AnimatePresence>
            {previewEntry ? (
              (() => {
                const definition = getAppDefinition(previewEntry.appId);
                const Icon = definition.icon;
                const previewImage = previewImages[previewEntry.windowId];
                return (
                  <motion.div
                    key={previewEntry.id}
                    className="taskbar__preview w11-flyout w11-thumb"
                    style={{ left: previewEntry.left, bottom: previewEntry.bottom, width: TASKBAR_PREVIEW_WIDTH, "--app-accent": definition.accent } as CSSProperties}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.14 }}
                  >
                    <div className="w11-thumb__header">
                      <Icon size={16} />
                      <span>{previewEntry.title}</span>
                    </div>
                    <div className="w11-thumb__frame">
                      {previewImage ? (
                        <img src={previewImage} alt={`${previewEntry.title} preview`} />
                      ) : (
                        // Windows shows the app's icon when it has no live thumbnail.
                        <Icon size={48} />
                      )}
                    </div>
                  </motion.div>
                );
              })()
            ) : null}
          </AnimatePresence>,
          document.body
        )
      : null;

  const jumpListNode =
    typeof document !== "undefined"
      ? createPortal(
          <AnimatePresence>
            {jumpListMenu ? (
              (() => {
                const def = getAppDefinition(jumpListMenu.appId);
                const Icon = def.icon;
                return (
                  <motion.div
                    key={jumpListMenu.appId}
                    className="taskbar__jump-list w11-flyout w11-jump"
                    style={{ left: jumpListMenu.left, bottom: jumpListMenu.bottom, "--app-accent": def.accent } as CSSProperties}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.14 }}
                  >
                    <div className="taskbar__jump-list-header">
                      <span className="taskbar__jump-list-icon" style={{ color: def.accent }}><Icon size={14} /></span>
                      <strong className="taskbar__jump-list-title">{def.title}</strong>
                    </div>
                    {(def.jumpList ?? []).length > 0 ? (
                      <>
                        <div className="taskbar__jump-list-section">
                          {(def.jumpList ?? []).map((item) => (
                            <button
                              key={item.id}
                              className="taskbar__jump-list-item"
                              type="button"
                              onClick={() => {
                                setJumpListMenu(null);
                                onLaunchApp(jumpListMenu.appId, item.payload);
                              }}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                        <div className="taskbar__jump-list-divider" />
                      </>
                    ) : null}
                    <div className="taskbar__jump-list-section">
                      <button
                        className="taskbar__jump-list-item"
                        type="button"
                        onClick={() => {
                          setJumpListMenu(null);
                          if (jumpListMenu.pinned) onUnpinApp(jumpListMenu.appId);
                          else onPinApp(jumpListMenu.appId);
                        }}
                      >
                        {jumpListMenu.pinned ? "Unpin from taskbar" : "Pin to taskbar"}
                      </button>
                      {jumpListMenu.windowId ? (
                        <button
                          className="taskbar__jump-list-item is-danger"
                          type="button"
                          onClick={() => {
                            setJumpListMenu(null);
                            onCloseWindow(jumpListMenu.windowId!);
                          }}
                        >
                          Close window
                        </button>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })()
            ) : null}
          </AnimatePresence>,
          document.body
        )
      : null;

  return (
    <>
      <footer className={cn("taskbar", "w11-taskbar", taskbarMod.root)}>
        <div className="w11-taskbar__center">
          <button
            className={cn("w11-taskbar__start", startMenuOpen && "is-active")}
            type="button"
            aria-label="Start"
            aria-pressed={startMenuOpen}
            onClick={onToggleStartMenu}
          >
            <LogoMark size={18} />
          </button>

          <SearchInput
            ref={taskbarSearchInputRef}
            aria-label="Search apps, files, links, and portfolio content"
            className="w11-taskbar__search-input"
            containerClassName={cn("w11-taskbar__search", startMenuOpen && "is-active")}
            placeholder="Search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            onFocus={onSearchFieldFocus}
            onKeyDown={handleTaskbarSearchKeyDown}
          />

          <div className="w11-taskbar__apps" ref={windowsRef} onScroll={() => setPreviewEntry(null)}>
            {slots.map((slot) => {
              if (slot.type === "pinned-closed") {
                const definition = getAppDefinition(slot.appId);
                const Icon = definition.icon;
                return (
                  <button
                    key={`pinned-${slot.appId}`}
                    className="w11-taskbar__app"
                    type="button"
                    data-tooltip={definition.title}
                    aria-label={`Launch ${definition.title}`}
                    onClick={() => onLaunchApp(slot.appId)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      const placement = getJumpListPlacement(e.currentTarget);
                      setPreviewEntry(null);
                      setJumpListMenu({ appId: slot.appId, pinned: true, ...placement });
                    }}
                  >
                    <Icon size={24} />
                  </button>
                );
              }

              const { entry, pinned } = slot;
              const definition = getAppDefinition(entry.appId);
              const Icon = definition.icon;
              const focused = entry.active && !entry.minimized;
              return (
                <button
                  key={entry.id}
                  data-window-id={entry.windowId}
                  className={cn("w11-taskbar__app", "is-open", focused && "is-active")}
                  type="button"
                  aria-label={entry.title}
                  aria-pressed={focused}
                  onClick={() => onToggleWindow(entry.windowId)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const placement = getJumpListPlacement(e.currentTarget);
                    setPreviewEntry(null);
                    setJumpListMenu({ appId: entry.appId, windowId: entry.windowId, pinned, ...placement });
                  }}
                  onMouseEnter={(event) => {
                    const placement = getPreviewPlacement(event.currentTarget);
                    setPreviewEntry({ ...entry, ...placement });
                    void capturePreview(entry);
                  }}
                  onFocus={(event) => {
                    const placement = getPreviewPlacement(event.currentTarget);
                    setPreviewEntry({ ...entry, ...placement });
                    void capturePreview(entry);
                  }}
                  onMouseLeave={() => setPreviewEntry((current) => (current?.windowId === entry.windowId ? null : current))}
                  onBlur={() => setPreviewEntry((current) => (current?.windowId === entry.windowId ? null : current))}
                >
                  <Icon size={24} />
                  <span className="w11-taskbar__indicator" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="w11-taskbar__tray">
          <button
            className="w11-taskbar__tray-button w11-taskbar__quick"
            type="button"
            aria-label="Quick settings - open Settings"
            onClick={() => onLaunchApp("settings")}
          >
            <Wifi size={16} aria-hidden="true" />
            <Volume2 size={16} aria-hidden="true" />
            <BatteryFull size={16} aria-hidden="true" />
          </button>
          <button
            className={cn("w11-taskbar__tray-button w11-taskbar__clock", calendarOpen && "is-active")}
            type="button"
            aria-label={`${formatClock(now)}, ${formatTrayDate(now)} - open calendar`}
            onClick={onToggleCalendar}
          >
            <span>{formatClock(now)}</span>
            <span>{formatTrayDate(now)}</span>
          </button>
          <button
            className="w11-taskbar__show-desktop"
            type="button"
            aria-label="Show desktop"
            title="Show desktop"
            onClick={onShowDesktop}
          />
        </div>
      </footer>

      {previewNode}
      {jumpListNode}
    </>
  );
}
