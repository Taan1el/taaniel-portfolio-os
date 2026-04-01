import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toPng } from "html-to-image";
import { Grid2x2, MonitorDown, Search, Sparkles } from "lucide-react";
import { getAppDefinition } from "@/lib/app-registry";
import { formatClock, formatDateLabel } from "@/lib/utils";
import type { TaskbarWindowEntry } from "@/types/system";

const TASKBAR_PREVIEW_WIDTH = 220;

function getPreviewLeft(container: HTMLDivElement, button: HTMLButtonElement) {
  const containerRect = container.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const centeredLeft =
    buttonRect.left - containerRect.left + buttonRect.width / 2 - TASKBAR_PREVIEW_WIDTH / 2;

  return Math.max(0, Math.min(centeredLeft, Math.max(0, containerRect.width - TASKBAR_PREVIEW_WIDTH)));
}

interface TaskbarProps {
  entries: TaskbarWindowEntry[];
  startMenuOpen: boolean;
  searchOpen: boolean;
  calendarOpen: boolean;
  themeName: string;
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
  themeName,
  onToggleStartMenu,
  onToggleSearch,
  onToggleCalendar,
  onToggleWindow,
  onShowDesktop,
}: TaskbarProps) {
  const [now, setNow] = useState(() => new Date());
  const [previewEntry, setPreviewEntry] = useState<(TaskbarWindowEntry & { left: number }) | null>(null);
  const [previewImages, setPreviewImages] = useState<Record<string, string | null>>({});
  const windowsRef = useRef<HTMLDivElement | null>(null);
  const captureQueueRef = useRef<Set<string>>(new Set());

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
    setPreviewImages((current) => {
      const activeWindowIds = new Set(entries.map((entry) => entry.id));
      const nextEntries = Object.entries(current).filter(([windowId]) => activeWindowIds.has(windowId));

      if (nextEntries.length === Object.keys(current).length) {
        return current;
      }

      return Object.fromEntries(nextEntries);
    });
  }, [entries]);

  useEffect(() => {
    if (!previewEntry || !windowsRef.current) {
      return;
    }

    const handleResize = () => {
      const activeButton = windowsRef.current?.querySelector<HTMLButtonElement>(
        `[data-window-id="${previewEntry.id}"]`
      );

      if (!windowsRef.current || !activeButton) {
        setPreviewEntry(null);
        return;
      }

      setPreviewEntry((current) =>
        current
          ? {
              ...current,
              left: getPreviewLeft(windowsRef.current as HTMLDivElement, activeButton),
            }
          : current
      );
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [previewEntry]);

  const capturePreview = async (windowId: string) => {
    if (captureQueueRef.current.has(windowId)) {
      return;
    }

    captureQueueRef.current.add(windowId);

    try {
      const node = document.querySelector<HTMLElement>(`[data-window-preview-id="${windowId}"]`);

      if (!node) {
        setPreviewImages((current) => ({ ...current, [windowId]: null }));
        return;
      }

      const image = await toPng(node, {
        cacheBust: true,
        pixelRatio: 0.75,
        skipFonts: true,
        backgroundColor: "#0b1421",
      });

      setPreviewImages((current) => ({ ...current, [windowId]: image }));
    } catch {
      setPreviewImages((current) => ({ ...current, [windowId]: null }));
    } finally {
      captureQueueRef.current.delete(windowId);
    }
  };

  return (
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
                data-window-id={entry.id}
                className={`taskbar__item ${entry.active ? "is-active" : ""}`}
                type="button"
                onClick={() => onToggleWindow(entry.id)}
                onMouseEnter={(event) => {
                  if (!windowsRef.current) {
                    return;
                  }

                  setPreviewEntry({
                    ...entry,
                    left: getPreviewLeft(windowsRef.current, event.currentTarget),
                  });

                  if (!entry.minimized) {
                    void capturePreview(entry.id);
                  }
                }}
                onMouseLeave={() =>
                  setPreviewEntry((current) => (current?.id === entry.id ? null : current))
                }
              >
                <Icon size={14} />
                <span>{entry.title}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {previewEntry ? (
            (() => {
              const definition = getAppDefinition(previewEntry.appId);
              const Icon = definition.icon;
              const previewImage = previewImages[previewEntry.id];

              return (
                <motion.div
                  key={previewEntry.id}
                  className="taskbar__preview"
                  style={{ left: previewEntry.left, width: TASKBAR_PREVIEW_WIDTH }}
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
                        <span
                          className="taskbar__preview-fallback-icon"
                          style={{ "--app-accent": definition.accent } as React.CSSProperties}
                        >
                          <Icon size={24} />
                        </span>
                        <small>{previewEntry.minimized ? "Preview unavailable while minimized" : "Live preview unavailable"}</small>
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
        </AnimatePresence>
      </div>

      <div className="taskbar__tray">
        <span className="taskbar__theme">
          <Sparkles size={14} />
          {themeName}
        </span>
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
  );
}
