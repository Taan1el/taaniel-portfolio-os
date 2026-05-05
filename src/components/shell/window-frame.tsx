import { Suspense, forwardRef, useEffect, useRef, useState, type CSSProperties } from "react";
import { Maximize2, Minimize2, Minus, X } from "lucide-react";
import { motion } from "framer-motion";
import { Rnd } from "react-rnd";
import { createPortal } from "react-dom";
import { getAppComponent, getAppDefinition } from "@/lib/app-registry";
import { cn } from "@/lib/utils";
import type { AppWindow } from "@/types/system";
import wfStyles from "@/components/shell/window-frame.module.css";

type SnapZone = "top" | "left" | "right";

const SNAP_THRESHOLD = 10; // px from edge to trigger snap zone

interface WindowFrameProps {
  window: AppWindow;
  active: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onBoundsChange: (nextBounds: Pick<AppWindow, "x" | "y" | "width" | "height">) => void;
}

export const WindowFrame = forwardRef<HTMLElement, WindowFrameProps>(function WindowFrame(
  {
    window,
    active,
    onFocus,
    onClose,
    onMinimize,
    onMaximize,
    onBoundsChange,
  },
  ref
) {
  const definition = getAppDefinition(window.appId);
  const Icon = definition.icon;
  const WindowComponent = getAppComponent(window.appId);
  const [interacting, setInteracting] = useState(false);
  const [snapZone, setSnapZone] = useState<SnapZone | null>(null);
  const snapZoneRef = useRef<SnapZone | null>(null);
  // Track where the drag started so we don't fire snap zones until the user
  // has actually moved the window away from its initial position. Without this,
  // snapped windows (y=0) immediately trigger the "top" fullscreen snap on the
  // first drag event before the user has moved the mouse at all.
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const DRAG_ACTIVATION_PX = 32; // px the user must move before snap zones activate

  const lockBodyScroll = () => {
    document.body.dataset.windowDragLock = "true";
    document.body.style.overflow = "hidden";
  };

  const unlockBodyScroll = () => {
    delete document.body.dataset.windowDragLock;
    document.body.style.removeProperty("overflow");
  };

  useEffect(() => () => unlockBodyScroll(), []);

  const snapGhost =
    snapZone && typeof document !== "undefined"
      ? createPortal(
          <div
            className={`window-snap-ghost window-snap-ghost--${snapZone}`}
            aria-hidden="true"
          />,
          document.body
        )
      : null;

  return (
    <>
      <Rnd
        bounds="parent"
        size={{ width: window.width, height: window.height }}
        position={{ x: window.x, y: window.y }}
        minWidth={definition.minSize?.width ?? 320}
        minHeight={definition.minSize?.height ?? 240}
        disableDragging={window.maximized}
        enableResizing={definition.resizable !== false && !window.maximized}
        dragHandleClassName="window-header"
        cancel=".window-action-buttons, .window-frame__body button, .window-frame__body input, .window-frame__body textarea, .window-frame__body a"
        onDragStart={(_, data) => {
          setInteracting(true);
          lockBodyScroll();
          dragStartRef.current = { x: data.x, y: data.y };
        }}
        onDrag={(_, data) => {
          const parent = (data.node as HTMLElement).parentElement;
          if (!parent) return;
          const parentWidth = parent.getBoundingClientRect().width;

          // Only start checking for snap zones once the user has dragged at least
          // DRAG_ACTIVATION_PX from the starting position. This prevents snapped
          // windows (which start at y=0 or x=0) from immediately re-triggering
          // the fullscreen or edge snap on the very first drag event.
          const start = dragStartRef.current;
          const hasMoved = start
            ? Math.abs(data.x - start.x) + Math.abs(data.y - start.y) >= DRAG_ACTIVATION_PX
            : true;

          let zone: SnapZone | null = null;
          if (hasMoved) {
            if (data.y <= SNAP_THRESHOLD) {
              zone = "top";
            } else if (data.x <= SNAP_THRESHOLD) {
              zone = "left";
            } else if (data.x + window.width >= parentWidth - SNAP_THRESHOLD) {
              zone = "right";
            }
          }

          if (zone !== snapZoneRef.current) {
            snapZoneRef.current = zone;
            setSnapZone(zone);
          }
        }}
        onDragStop={(_, data) => {
          setInteracting(false);
          unlockBodyScroll();
          dragStartRef.current = null;

          const zone = snapZoneRef.current;
          snapZoneRef.current = null;
          setSnapZone(null);

          if (zone === "top") {
            onMaximize();
            return;
          }

          if (zone === "left" || zone === "right") {
            const parent = (data.node as HTMLElement).parentElement;
            const parentRect = parent?.getBoundingClientRect();
            const pw = parentRect?.width ?? 800;
            const ph = parentRect?.height ?? 600;
            onBoundsChange({
              x: zone === "right" ? Math.floor(pw / 2) : 0,
              y: 0,
              width: Math.floor(pw / 2),
              height: ph,
            });
            return;
          }

          onBoundsChange({ x: data.x, y: data.y, width: window.width, height: window.height });
        }}
        onResizeStart={() => {
          setInteracting(true);
          lockBodyScroll();
        }}
        onResizeStop={(_, __, ref, ___, position) => {
          setInteracting(false);
          unlockBodyScroll();
          onBoundsChange({
            x: position.x,
            y: position.y,
            width: ref.offsetWidth,
            height: ref.offsetHeight,
          });
        }}
        style={{ zIndex: window.zIndex }}
        className={cn("window-frame__rnd", !interacting && "is-animated")}
      >
        <motion.section
          ref={ref}
          data-window-preview-id={window.id}
          role="dialog"
          aria-labelledby={`window-title-${window.id}`}
          aria-modal="false"
          className={cn("window-frame", wfStyles.surface, active && "is-active", interacting && "is-dragging")}
          onMouseDown={onFocus}
          onTouchStart={onFocus}
          onAnimationComplete={() => setInteracting(false)}
          layout
          initial={{ opacity: 0, scale: 0.96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.82, y: 48, filter: "blur(6px)" }}
          transition={{ duration: 0.22, ease: [0.4, 0, 1, 1] }}
        >
          <header className="window-frame__header window-header" onDoubleClick={onMaximize}>
            {/* Left spacer matches button area width so title stays truly centered */}
            <div className="window-frame__actions-spacer" aria-hidden="true" />

            {/* Title — absolutely centred so it doesn't push the buttons */}
            <div className="window-frame__title window-frame__title--centered">
              <span className="window-frame__title-icon" style={{ "--app-accent": definition.accent } as CSSProperties}>
                <Icon size={13} />
              </span>
              <strong id={`window-title-${window.id}`}>{window.title}</strong>
            </div>

            {/* Traffic lights — right side */}
            <div className="window-frame__actions window-action-buttons">
              <button type="button" aria-label="Minimize" className="is-minimize" onClick={onMinimize}>
                <Minus size={9} />
              </button>
              <button type="button" aria-label={window.maximized ? "Restore" : "Maximize"} className="is-maximize" onClick={onMaximize}>
                {window.maximized ? <Minimize2 size={9} /> : <Maximize2 size={9} />}
              </button>
              <button type="button" aria-label="Close" className="is-close" onClick={onClose}>
                <X size={9} />
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

      {snapGhost}
    </>
  );
});
