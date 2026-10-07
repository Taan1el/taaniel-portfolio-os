import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ContextMenuState } from "@/types/system";

interface ContextMenuProps {
  menu: ContextMenuState;
  onClose: () => void;
}

const EDGE_GAP = 8;

export function ContextMenu({ menu, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: menu.x, top: menu.y });

  // Keep the menu on screen: shift left at the right edge, open upward near the bottom, like Windows.
  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!element) return;
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const left = Math.max(EDGE_GAP, Math.min(menu.x, window.innerWidth - width - EDGE_GAP));
    const fitsBelow = menu.y + height <= window.innerHeight - EDGE_GAP;
    const top = fitsBelow ? menu.y : Math.max(EDGE_GAP, menu.y - height);
    setPosition({ left, top });
  }, [menu.x, menu.y, menu.actions.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <motion.div
      ref={menuRef}
      role="menu"
      aria-label={menu.title}
      className="context-menu"
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 6 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      style={{ left: position.left, top: position.top }}
    >
      {menu.title ? <p className="context-menu__title">{menu.title}</p> : null}
      <div className="context-menu__actions">
        {menu.actions.map((action, index) => (
          action.separator ? (
            <div key={`sep-${index}`} className="context-menu__separator" aria-hidden="true" />
          ) : (
            <button
              key={action.id}
              className={cn("context-menu__item", action.danger && "is-danger")}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              onClick={() => {
                action.onSelect();
                onClose();
              }}
            >
              {action.icon ? (
                <span className="context-menu__item-icon">
                  <action.icon size={13} strokeWidth={1.8} />
                </span>
              ) : (
                <span className="context-menu__item-icon context-menu__item-icon--empty" aria-hidden="true" />
              )}
              <span className="context-menu__item-label">{action.label}</span>
              {action.shortcut ? (
                <kbd className="context-menu__item-shortcut">{action.shortcut}</kbd>
              ) : null}
            </button>
          )
        ))}
      </div>
    </motion.div>
  );
}
