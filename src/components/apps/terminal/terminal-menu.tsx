import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";

export interface TerminalMenuItem {
  id: string;
  label: string;
  /** Shown on the right, as a hint: "Ctrl+Shift+D". */
  shortcut?: string;
  icon?: ReactNode;
  disabled?: boolean;
  /** Draws a divider above this item. */
  separatorBefore?: boolean;
  onSelect: () => void;
}

interface TerminalMenuProps {
  label: string;
  items: TerminalMenuItem[];
  /** Where to open it, in viewport coordinates: a click, or the corner of the button that opened it. */
  anchor: { x: number; y: number };
  /** The element the menu is positioned inside of. */
  boundary: RefObject<HTMLElement | null>;
  /** `restoreFocus` is true when the menu was dismissed with the keyboard or by choosing an item. */
  onClose: (restoreFocus: boolean) => void;
  className?: string;
}

const enabledIndexes = (items: TerminalMenuItem[]) => items.flatMap((item, index) => (item.disabled ? [] : [index]));

/**
 * An accessible menu: role="menu" with menuitems, arrow keys, Home and End,
 * Escape to close, and focus handed back to whatever opened it.
 */
export function TerminalMenu({ label, items, anchor, boundary, onClose, className }: TerminalMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  // Position inside the window, nudged back when it would run past an edge.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const area = boundary.current?.getBoundingClientRect();
    if (!menu || !area) return;
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const left = Math.max(4, Math.min(anchor.x - area.left, area.width - width - 4));
    const top = Math.max(4, Math.min(anchor.y - area.top, area.height - height - 4));
    setPosition({ left, top });
  }, [anchor.x, anchor.y, boundary, items.length]);

  useEffect(() => {
    const first = enabledIndexes(items)[0];
    menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')[first ?? 0]?.focus();
    // Only on open: re-running when items change would pull focus back to the top.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose(false);
    };
    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, [onClose]);

  const move = (current: number, key: string) => {
    const enabled = enabledIndexes(items);
    if (!enabled.length) return;
    const at = enabled.indexOf(current);
    let next = enabled[0];
    if (key === "ArrowDown") next = enabled[(at + 1) % enabled.length];
    else if (key === "ArrowUp") next = enabled[(at - 1 + enabled.length) % enabled.length];
    else if (key === "End") next = enabled[enabled.length - 1];
    menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')[next]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
      return;
    }
    if (event.key === "Tab") {
      // Tab leaves the menu rather than trapping it, like every other menu on the desktop.
      onClose(false);
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      const current = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? []).indexOf(document.activeElement as Element);
      move(current, event.key);
    }
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={label}
      className={cn("w11-terminal__menu", className)}
      // Until it has been measured and placed it is transparent, not hidden: hidden items cannot take focus.
      style={position ? { left: position.left, top: position.top } : { left: 0, top: 0, opacity: 0 }}
      onKeyDown={handleKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item) => (
        <div key={item.id} role="none">
          {item.separatorBefore ? <div role="separator" className="w11-terminal__menu-separator" /> : null}
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            disabled={item.disabled}
            className="w11-terminal__menu-item"
            onClick={() => {
              onClose(true);
              item.onSelect();
            }}
          >
            <span className="w11-terminal__menu-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="w11-terminal__menu-label">{item.label}</span>
            {item.shortcut ? <span className="w11-terminal__menu-shortcut">{item.shortcut}</span> : null}
          </button>
        </div>
      ))}
    </div>
  );
}
