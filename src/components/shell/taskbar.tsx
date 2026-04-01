import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { toPng } from "html-to-image";
import { Grid2x2, MonitorDown, Search } from "lucide-react";
import { getAppDefinition } from "@/lib/app-registry";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatClock, formatDateLabel } from "@/lib/utils";
import type { AppId, TaskbarWindowEntry } from "@/types/system";

const TASKBAR_PREVIEW_WIDTH = 256;
const TASKBAR_PREVIEW_OFFSET = 12;
const PREVIEW_FALLBACK_APPS = new Set<AppId>(["browser", "editor", "paint", "snake", "tetris", "dino", "terminal", "v86"]);

function getPreviewPlacement(button: HTMLButtonElement) {
  const buttonRect = button.getBoundingClientRect();
  const left = Math.max(
    16,
    Math.min(
      buttonRect.left + buttonRect.width / 2 - TASKBAR_PREVIEW_WIDTH / 2,
      window.innerWidth - TASKBAR_PREVIEW_WIDTH - 16
    )
  );

  return {
    left,
    bottom: window.innerHeight - buttonRect.top + TASKBAR_PREVIEW_OFFSET,
  };
}

interface TaskbarPreviewEntry extends TaskbarWindowEntry {
  left: number;
  bottom: number;
}

interface TaskbarProps {
  entries: TaskbarWindowEntry[];
  startMenuOpen: boolean;
  searchOpen: boolean;
  calendarOpen: boolean;
  onToggleStartMenu: () => void;
  onToggleSearch: () => void;
  onToggleCalendar: () => void;
  onToggleWindow: (windowId: string) => void;
  onShowDesktop: () => void;
}

export function Taskbar({
  entries,
  startMenuOpen,
  searchOpen,
  calendarOpen,
  onToggleStartMenu,
  onToggleSearch,
  onToggleCalendar,
  onToggleWindow,
  onShowDesktop,
}: TaskbarProps) {
  const [now, setNow] = useState(() => new Date());
  const [previewEntry, setPreviewEntry] = useState<TaskbarPreviewEntry | null>(null);
  const [previewImages, setPreviewImages] = useState<Record<string, string | null>>({});
  const windowsRef = useRef<HTMLDivElement | null>(null);
  const captureQueueRef = useRef<Set<string>>(new Set());
  const prefersTapPreview = useMediaQuery("(hover: none), (max-width: 819px)");

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000 * 30);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (previewEntry && !entries.some((entry) => entry.id === previewEntry.id)) {
      setPreviewEntry(null);
    }
  }, [entries, previewEntry]);

  useEffect(() => {
    if (!prefersTapPreview || !previewEntry) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target) {
        return;
      }

      if (target.closest(".taskbar__item") || target.closest(".taskbar__preview")) {
        return;
      }

      setPreviewEntry(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [prefersTapPreview, previewEntry]);

  useEffect(() => {
    setPreviewImages((current) => {
      const activeWindowIds = new Set(entries.map((entry) => entry.windowId));
      const nextEntries = Object.entries(current).filter(([windowId]) => activeWindowIds.has(windowId));

      if (nextEntries.length === Object.keys(current).length) {
        return current;
      }

      return Object.fromEntries(nextEntries);
    });
  }, [entries]);

  useEffect(() => {
    if (!previewEntry) {
      return;
    }

      const syncPreviewPosition = () => {
        const activeButton = windowsRef.current?.querySelector<HTMLButtonElement>(
          `[data-window-id="${previewEntry.windowId}"]`
        );

      if (!activeButton) {
        setPreviewEntry(null);
        return;
      }

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
    if (
      entry.minimized ||
      PREVIEW_FALLBACK_APPS.has(entry.appId) ||
      captureQueueRef.current.has(entry.windowId)
    ) {
      setPreviewImages((current) => ({ ...current, [entry.windowId]: null }));
      return;
    }

    captureQueueRef.current.add(entry.windowId);

    try {
      const node = document.querySelector<HTMLElement>(`[data-window-preview-id="${entry.windowId}"]`);

      if (!node || node.querySelector("iframe, canvas, .xterm")) {
        setPreviewImages((current) => ({ ...current, [entry.windowId]: null }));
        return;
      }

      const image = await toPng(node, {
        cacheBust: true,
        pixelRatio: 0.7,
        skipFonts: true,
        backgroundColor: "#09101a",
      });

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
                    className="taskbar__preview"
                    style={
                      {
                        left: previewEntry.left,
                        bottom: previewEntry.bottom,
                        width: TASKBAR_PREVIEW_WIDTH,
                        "--app-accent": definition.accent,
                      } as CSSProperties
                    }
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.14 }}
                  >
                    <div className="taskbar__preview-frame">
                      {previewImage ? (
                        <img
                          className="taskbar__preview-image"
                          src={previewImage}
                          alt={`${previewEntry.title} preview`}
                        />
                      ) : (
                        <div className="taskbar__preview-fallback">
                          <span className="taskbar__preview-fallback-icon">
                            <Icon size={24} />
                          </span>
                          <small>
                            {previewEntry.minimized
                              ? "Preview unavailable while minimized"
                              : "Using an app card because this window doesn't capture cleanly"}
                          </small>
                        </div>
                      )}
                    </div>
                    <strong>{previewEntry.preview.title}</strong>
                    <small>{previewEntry.preview.subtitle}</small>
                    <span className={`taskbar__preview-status is-${previewEntry.preview.status}`}>
                      {previewEntry.preview.status}
                    </span>
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
      <footer className="taskbar">
        <button
          className={`taskbar__start ${startMenuOpen ? "is-active" : ""}`}
          type="button"
          onClick={onToggleStartMenu}
        >
          <Grid2x2 size={16} />
          Start
        </button>

        <button
          className={`taskbar__search ${searchOpen ? "is-active" : ""}`}
          type="button"
          onClick={onToggleSearch}
        >
          <Search size={15} />
          Search apps and files
        </button>

        <div className="taskbar__windows" ref={windowsRef}>
          <div className="taskbar__window-strip" onScroll={() => setPreviewEntry(null)}>
            {entries.map((entry) => {
              const definition = getAppDefinition(entry.appId);
              const Icon = definition.icon;

              return (
                <button
                  key={entry.id}
                  data-window-id={entry.windowId}
                  className={`taskbar__item ${entry.active ? "is-active" : ""}`}
                  type="button"
                  onClick={() => {
                    if (prefersTapPreview) {
                      const activeButton = windowsRef.current?.querySelector<HTMLButtonElement>(
                        `[data-window-id="${entry.windowId}"]`
                      );

                      if (!activeButton) {
                        onToggleWindow(entry.windowId);
                        return;
                      }

                      const placement = getPreviewPlacement(activeButton);
                      const nextPreviewEntry = {
                        ...entry,
                        ...placement,
                      };

                    if (previewEntry?.windowId !== entry.windowId) {
                      setPreviewEntry(nextPreviewEntry);
                      void capturePreview(entry);
                      return;
                    }
                  }

                  setPreviewEntry((current) =>
                    current?.windowId === entry.windowId && prefersTapPreview ? null : current
                  );
                  onToggleWindow(entry.windowId);
                  }}
                  onMouseEnter={(event) => {
                    if (prefersTapPreview) {
                      return;
                    }

                    const placement = getPreviewPlacement(event.currentTarget);
                    setPreviewEntry({
                      ...entry,
                      ...placement,
                    });
                    void capturePreview(entry);
                  }}
                  onMouseLeave={() => {
                    if (prefersTapPreview) {
                      return;
                    }

                    setPreviewEntry((current) => (current?.windowId === entry.windowId ? null : current));
                  }}
                >
                  <Icon size={14} />
                  <span>{entry.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="taskbar__tray">
          <button
            className={`taskbar__clock ${calendarOpen ? "is-active" : ""}`}
            type="button"
            onClick={onToggleCalendar}
          >
            <strong>{formatClock(now)}</strong>
            <small>{formatDateLabel(now)}</small>
          </button>
          <button className="taskbar__desktop" type="button" onClick={onShowDesktop}>
            <MonitorDown size={14} />
          </button>
        </div>
      </footer>

      {previewNode}
    </>
  );
}
