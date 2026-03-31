import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Grid2x2, MonitorDown, Sparkles } from "lucide-react";
import { getAppDefinition } from "@/lib/app-registry";
import { formatClock, formatDateLabel } from "@/lib/utils";
import type { AppWindow } from "@/types/system";

interface TaskbarProps {
  windows: AppWindow[];
  activeWindowId: string | null;
  startMenuOpen: boolean;
  calendarOpen: boolean;
  themeName: string;
  onToggleStartMenu: () => void;
  onToggleCalendar: () => void;
  onToggleWindow: (windowId: string) => void;
  onShowDesktop: () => void;
}

export function Taskbar({
  windows,
  activeWindowId,
  startMenuOpen,
  calendarOpen,
  themeName,
  onToggleStartMenu,
  onToggleCalendar,
  onToggleWindow,
  onShowDesktop,
}: TaskbarProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000 * 30);
    return () => window.clearInterval(intervalId);
  }, []);

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

      <div className="taskbar__windows">
        {windows.map((windowState) => {
          const definition = getAppDefinition(windowState.appId);
          const Icon = definition.icon;

          return (
            <div key={windowState.id} className="taskbar__item-wrap">
              <button
                className={`taskbar__item ${activeWindowId === windowState.id && !windowState.minimized ? "is-active" : ""}`}
                type="button"
                onClick={() => onToggleWindow(windowState.id)}
              >
                <Icon size={14} />
                <span>{windowState.title}</span>
              </button>
              <motion.div
                className="taskbar__preview"
                initial={{ opacity: 0, y: 8 }}
                whileHover={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16 }}
              >
                <strong>{windowState.title}</strong>
                <small>{definition.title}</small>
              </motion.div>
            </div>
          );
        })}
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
