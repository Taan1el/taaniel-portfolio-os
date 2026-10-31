import { Suspense, forwardRef, useEffect, useImperativeHandle, useRef, useState, type MouseEvent } from "react";
import { SnapFlyout } from "@/components/shell/snap-flyout";
import { LEFT_HALF, RIGHT_HALF, zoneBounds, type SnapZone } from "@/lib/snap-layouts";
import { unlockAchievement } from "@/stores/achievements-store";
import { useShellStore } from "@/stores/shell-store";
import { getDesktopSize } from "@/stores/system-runtime";
import { desktopOf, useWindowStore } from "@/stores/window-store";
import { motion } from "framer-motion";
import { Rnd } from "react-rnd";
import { createPortal } from "react-dom";
import { getAppComponent, getAppDefinition } from "@/lib/app-registry";
import { windowDropProps } from "@/lib/dnd/dom";
import { cn } from "@/lib/utils";
import { TitlebarSlotContext } from "@/components/shell/titlebar-slot";
import type { AppWindow, ContextMenuAction } from "@/types/system";
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

type DragSnapZone = "top" | "left" | "right";

const SNAP_THRESHOLD = 10; // px from edge to trigger snap zone

interface WindowFrameProps {
  window: AppWindow;
  active: boolean;
  hidden?: boolean;
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
    hidden = false,
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
  const sectionRef = useRef<HTMLElement>(null);
  useImperativeHandle(ref, () => sectionRef.current as HTMLElement);

  // The active window owns keyboard focus, whichever way it became active.
  // Apps that focus their own control have already done so: child effects run first.
  useEffect(() => {
    if (!active || hidden) return undefined;
    const focusSection = () => {
      const section = sectionRef.current;
      if (section && !section.contains(document.activeElement)) section.focus({ preventScroll: true });
    };
    focusSection();
    // A window coming back from another desktop only becomes focusable once it is painted.
    const frame = requestAnimationFrame(focusSection);
    return () => cancelAnimationFrame(frame);
  }, [active, hidden]);
  const [snapZone, setSnapZone] = useState<DragSnapZone | null>(null);
  const snapZoneRef = useRef<DragSnapZone | null>(null);
  const titlebarTabs = Boolean(definition.titlebarTabs);
  const [titlebarSlot, setTitlebarSlot] = useState<HTMLElement | null>(null);

  const [snapAnchor, setSnapAnchor] = useState<DOMRect | null>(null);
  const snapHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportMode = useShellStore((state) => state.viewportMode);

  const hoverSnap = (hovering: boolean, anchor?: HTMLElement) => {
    if (snapHoverTimer.current) clearTimeout(snapHoverTimer.current);
    if (viewportMode === "mobile") return;
    snapHoverTimer.current = setTimeout(
      () => setSnapAnchor(hovering ? (anchor?.getBoundingClientRect() ?? snapAnchor) : null),
      hovering ? 350 : 180
    );
  };

  useEffect(() => () => {
    if (snapHoverTimer.current) clearTimeout(snapHoverTimer.current);
  }, []);

  const snapTo = (zone: SnapZone) => {
    if (snapHoverTimer.current) clearTimeout(snapHoverTimer.current);
    setSnapAnchor(null);
    useWindowStore.getState().snapWindow(window.id, zoneBounds(zone, getDesktopSize()));
    unlockAchievement("snap");
  };

  const openWindowMenu = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const { desktopCount, moveWindowToDesktop } = useWindowStore.getState();
    const current = desktopOf(window);
    const moves: ContextMenuAction[] = [];
    for (let desktop = 1; desktop <= desktopCount; desktop += 1) {
      if (desktop !== current) {
        moves.push({ id: `move-${desktop}`, label: `Move to Desktop ${desktop}`, onSelect: () => moveWindowToDesktop(window.id, desktop) });
      }
    }
    useShellStore.getState().setContextMenu({
      x: event.clientX,
      y: event.clientY,
      title: window.title,
      actions: [
        { id: "snap-left", label: "Snap left", shortcut: "Alt+Shift+Left", onSelect: () => snapTo(LEFT_HALF) },
        { id: "snap-right", label: "Snap right", shortcut: "Alt+Shift+Right", onSelect: () => snapTo(RIGHT_HALF) },
        { id: "maximize", label: window.maximized ? "Restore" : "Maximize", shortcut: "Alt+Shift+Up", onSelect: onMaximize },
        { id: "minimize", label: "Minimize", shortcut: "Alt+Shift+Down", onSelect: onMinimize },
        ...moves,
        { id: "close", label: "Close", shortcut: "Alt+Shift+W", danger: true, onSelect: onClose },
      ],
    });
  };

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
        cancel=".window-action-buttons, .w11-titlebar__slot button, .window-frame__body button, .window-frame__body input, .window-frame__body textarea, .window-frame__body a"
        onDragStart={() => {
          setInteracting(true);
          lockBodyScroll();
        }}
        onDrag={(_, data) => {
          const parent = (data.node as HTMLElement).parentElement;
          if (!parent) return;
          const parentWidth = parent.getBoundingClientRect().width;

          let zone: DragSnapZone | null = null;
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
        style={{ zIndex: window.zIndex, display: hidden ? "none" : undefined }}
        className={cn("window-frame__rnd", !interacting && "is-animated")}
      >
        <motion.section
          ref={sectionRef}
          tabIndex={-1}
          aria-roledescription="window"
          onFocusCapture={() => {
            if (!active) onFocus();
          }}
          data-window-preview-id={window.id}
          // A file dragged onto the window opens in it (or moves into the folder an Explorer window shows).
          {...windowDropProps(window.id, window.appId)}
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
            className={cn(
              "window-frame__header window-header w11-titlebar",
              titlebarTabs && "w11-titlebar--tabs",
              window.maximized && "is-maximized"
            )}
            onDoubleClick={onMaximize}
            onContextMenu={openWindowMenu}
          >
            {titlebarTabs ? (
              <>
                {/* The app's tabs take the title's place; the title stays for screen readers. */}
                <strong id={`window-title-${window.id}`} className="w11-titlebar__hidden-title">
                  {window.title}
                </strong>
                <div className="w11-titlebar__slot" ref={setTitlebarSlot} />
              </>
            ) : (
              <div className="w11-titlebar__title">
                <Icon size={16} />
                <strong id={`window-title-${window.id}`}>{window.title}</strong>
              </div>
            )}

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
                onMouseEnter={(event) => hoverSnap(true, event.currentTarget)}
                onMouseLeave={() => hoverSnap(false)}
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
              <TitlebarSlotContext.Provider value={titlebarTabs ? titlebarSlot : null}>
                <WindowComponent window={window} />
              </TitlebarSlotContext.Provider>
            </Suspense>
          </div>
        </motion.section>
      </Rnd>

      {snapGhost}
      {snapAnchor ? <SnapFlyout anchor={snapAnchor} onPick={snapTo} onHoverChange={(hovering) => hoverSnap(hovering)} /> : null}
    </>
  );
});
