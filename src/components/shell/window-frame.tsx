import { Suspense, type CSSProperties } from "react";
import { Maximize2, Minimize2, Minus, X } from "lucide-react";
import { motion } from "framer-motion";
import { Rnd } from "react-rnd";
import { getAppDefinition } from "@/lib/app-registry";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import type { AppWindow } from "@/types/system";

interface WindowFrameProps {
  window: AppWindow;
  active: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onBoundsChange: (nextBounds: Pick<AppWindow, "x" | "y" | "width" | "height">) => void;
}

export function WindowFrame({
  window,
  active,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onBoundsChange,
}: WindowFrameProps) {
  const definition = getAppDefinition(window.appId);
  const Icon = definition.icon;
  const WindowComponent = definition.component;
  const isMobile = useMediaQuery("(max-width: 819px)");

  return (
    <Rnd
      bounds="parent"
      size={{ width: window.width, height: window.height }}
      position={{ x: window.x, y: window.y }}
      minWidth={320}
      minHeight={240}
      disableDragging={window.maximized || isMobile}
      enableResizing={!window.maximized && !isMobile}
      dragHandleClassName="window-frame__header"
      onDragStop={(_, data) => onBoundsChange({ x: data.x, y: data.y, width: window.width, height: window.height })}
      onResizeStop={(_, __, ref, ___, position) =>
        onBoundsChange({
          x: position.x,
          y: position.y,
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        })
      }
      style={{ zIndex: window.zIndex }}
      className="window-frame__rnd"
    >
      <motion.section
        className={cn("window-frame", active && "is-active")}
        onMouseDown={onFocus}
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 14 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="window-frame__header" onDoubleClick={onMaximize}>
          <div className="window-frame__title">
            <span className="window-frame__title-icon" style={{ "--app-accent": definition.accent } as CSSProperties}>
              <Icon size={15} />
            </span>
            <div>
              <strong>{window.title}</strong>
              <small>{definition.category}</small>
            </div>
          </div>
          <div className="window-frame__actions">
            <button type="button" aria-label="Minimize" onClick={onMinimize}>
              <Minus size={14} />
            </button>
            <button type="button" aria-label={window.maximized ? "Restore" : "Maximize"} onClick={onMaximize}>
              {window.maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button type="button" aria-label="Close" className="is-close" onClick={onClose}>
              <X size={14} />
            </button>
          </div>
        </header>

        <div className="window-frame__body">
          <Suspense fallback={<div className="app-loading">Loading application...</div>}>
            <WindowComponent window={window} />
          </Suspense>
        </div>
      </motion.section>
    </Rnd>
  );
}
