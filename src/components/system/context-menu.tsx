import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { motion } from "framer-motion";
import { getFocusable, useDialogFocus } from "@/hooks/use-dialog-focus";
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
  useDialogFocus(menuRef, { trap: false });

  const handleMenuKeys = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = getFocusable(menuRef.current);
    if (!items.length) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    const go = (next: number) => {
      event.preventDefault();
      items[(next + items.length) % items.length].focus();
    };
    if (event.key === "ArrowDown") go(index + 1);
    else if (event.key === "ArrowUp") go(index - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(items.length - 1);
    else if (event.key === "Tab") {
      event.preventDefault();
      onClose();
    } else if (event.key.length === 1) {
      // Type a letter to jump to the next item that starts with it.
      const letter = event.key.toLowerCase();
      const label = (item: HTMLElement) => item.textContent?.trim().toLowerCase() ?? "";
      const match = [...items.slice(index + 1), ...items.slice(0, index + 1)].find((item) => label(item).startsWith(letter));
      if (match) go(items.indexOf(match));
    }
  };

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
      onKeyDown={handleMenuKeys}
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
