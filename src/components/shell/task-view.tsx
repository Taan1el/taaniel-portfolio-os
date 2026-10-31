import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GalleryHorizontalEnd, Plus, X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { getAppDefinition } from "@/lib/app-registry";
import { cn } from "@/lib/utils";
import { MAX_DESKTOPS, desktopOf, useWindowStore } from "@/stores/window-store";
import { useProcessStore } from "@/stores/process-store";

function TaskViewPanel({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(panelRef);
  const { windows, activeDesktop, desktopCount, switchDesktop, addDesktop, removeDesktop } = useWindowStore(
    useShallow((state) => ({
      windows: state.windows,
      activeDesktop: state.activeDesktop,
      desktopCount: state.desktopCount,
      switchDesktop: state.switchDesktop,
      addDesktop: state.addDesktop,
      removeDesktop: state.removeDesktop,
    }))
  );
  const processes = useProcessStore((state) => state.processes);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!panelRef.current?.contains(target) && !target.closest(".w11-taskbar__taskview")) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div ref={panelRef} className="w11-flyout w11-taskview" role="dialog" aria-label="Task view" data-dnd-barrier>
      {Array.from({ length: desktopCount }, (_, index) => index + 1).map((desktop) => {
        const onDesktop = windows.filter((windowState) => desktopOf(windowState) === desktop);
        return (
          <div key={desktop} className={cn("w11-taskview__desktop", desktop === activeDesktop && "is-active")}>
            <button
              type="button"
              className="w11-taskview__card"
              aria-current={desktop === activeDesktop ? "true" : undefined}
              onClick={() => {
                switchDesktop(desktop);
                onClose();
              }}
            >
              <strong>Desktop {desktop}</strong>
              <span className="w11-taskview__windows">
                {onDesktop.length === 0 ? <small>No windows</small> : null}
                {onDesktop.slice(0, 5).map((windowState) => {
                  const process = processes.find((entry) => entry.id === windowState.processId);
                  if (!process) return null;
                  const Icon = getAppDefinition(process.appId).icon;
                  return (
                    <span key={windowState.id} title={windowState.title}>
                      <Icon size={22} />
                    </span>
                  );
                })}
              </span>
            </button>
            {desktopCount > 1 ? (
              <button type="button" className="w11-taskview__remove" aria-label={`Close Desktop ${desktop}`} onClick={() => removeDesktop(desktop)}>
                <X size={13} />
              </button>
            ) : null}
          </div>
        );
      })}
      {desktopCount < MAX_DESKTOPS ? (
        <button type="button" className="w11-taskview__add" onClick={() => addDesktop()}>
          <Plus size={18} />
          <span>New desktop</span>
        </button>
      ) : null}
    </div>
  );
}

export function TaskViewButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={cn("w11-taskbar__app w11-taskbar__taskview", open && "is-active")}
        aria-label="Task view"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Task view"
        onClick={() => setOpen((value) => !value)}
      >
        <GalleryHorizontalEnd size={20} />
      </button>
      {open ? createPortal(<TaskViewPanel onClose={() => setOpen(false)} />, document.body) : null}
    </>
  );
}
