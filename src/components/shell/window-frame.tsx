import { Suspense, forwardRef, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Rnd } from "react-rnd";
import { createPortal } from "react-dom";
import { getAppComponent, getAppDefinition } from "@/lib/app-registry";
import { cn } from "@/lib/utils";
import type { AppWindow } from "@/types/system";
import wfStyles from "@/components/shell/window-frame.module.css";

/**
 * Windows 11 caption glyphs: 10x10, 1px hairlines, the shapes Segoe Fluent
 * Icons uses for the minimize / maximize / restore / close buttons.
 */
function CaptionGlyph({ kind }: { kind: "minimize" | "maximize" | "restore" | "close" }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      {kind === "minimize" ? <path d="M0 5.5h10" stroke="currentColor" strokeWidth="1" /> : null}
      {kind === "maximize" ? (
        <rect x="0.5" y="0.5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1" />
      ) : null}
      {kind === "restore" ? (
        <>
          <rect x="0.5" y="2.5" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M2.5 2.5V2a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 9.5 2v4A1.5 1.5 0 0 1 8 7.5h-.5" fill="none" stroke="currentColor" strokeWidth="1" />
        </>
      ) : null}
      {kind === "close" ? <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" strokeWidth="1" /> : null}
    </svg>
  );
}

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
        minWidth={Math.min(definition.minSize?.width ?? 320, window.width)}
        minHeight={Math.min(definition.minSize?.height ?? 240, window.height)}
        disableDragging={window.maximized}
        enableResizing={definition.resizable !== false && !window.maximized}
        dragHandleClassName="window-header"
        cancel=".window-action-buttons, .window-frame__body button, .window-frame__body input, .window-frame__body textarea, .window-frame__body a"
        onDragStart={() => {
          setInteracting(true);
          lockBodyScroll();
        }}
        onDrag={(_, data) => {
          const parent = (data.node as HTMLElement).parentElement;
          if (!parent) return;
          const parentWidth = parent.getBoundingClientRect().width;

          let zone: SnapZone | null = null;
          if (data.y <= SNAP_THRESHOLD) {
            zone = "top";
          } else if (data.x <= SNAP_THRESHOLD) {
            zone = "left";
          } else if (data.x + window.width >= parentWidth - SNAP_THRESHOLD) {
            zone = "right";
          }

          if (zone !== snapZoneRef.current) {
            snapZoneRef.current = zone;
            setSnapZone(zone);
          }
        }}
        onDragStop={(_, data) => {
          setInteracting(false);
          unlockBodyScroll();

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
          className={cn("window-frame", wfStyles.surface, active && "is-active", interacting && "is-dragging", window.maximized && "is-maximized")}
          onMouseDown={onFocus}
          onTouchStart={onFocus}
          onAnimationComplete={() => setInteracting(false)}
          layout
          initial={{ opacity: 0, scale: 0.96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.82, y: 48, filter: "blur(6px)" }}
          transition={{ duration: 0.22, ease: [0.4, 0, 1, 1] }}
        >
          <header
            className={cn("window-frame__header window-header w11-titlebar", window.maximized && "is-maximized")}
            onDoubleClick={onMaximize}
          >
            <div className="w11-titlebar__title">
              <Icon size={16} />
              <strong id={`window-title-${window.id}`}>{window.title}</strong>
            </div>

            <div className="w11-caption window-action-buttons">
              <button type="button" aria-label="Minimize" title="Minimize" className="w11-caption__button" onClick={onMinimize}>
                <CaptionGlyph kind="minimize" />
              </button>
              <button
                type="button"
                aria-label={window.maximized ? "Restore down" : "Maximize"}
                title={window.maximized ? "Restore down" : "Maximize"}
                className="w11-caption__button"
                onClick={onMaximize}
              >
                <CaptionGlyph kind={window.maximized ? "restore" : "maximize"} />
              </button>
              <button
                type="button"
                aria-label="Close"
                title="Close"
                className="w11-caption__button w11-caption__button--close"
                onClick={onClose}
              >
                <CaptionGlyph kind="close" />
              </button>
            </div>
          </header>

          <div className="window-frame__body">
            <Suspense fallback={<div className="app-loading-skeleton" role="status" aria-label="Loading application" />}>
              <WindowComponent window={window} />
            </Suspense>
          </div>
        </motion.section>
      </Rnd>

      {snapGhost}
    </>
  );
});
