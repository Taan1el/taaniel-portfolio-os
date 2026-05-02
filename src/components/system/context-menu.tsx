import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ContextMenuState } from "@/types/system";

interface ContextMenuProps {
  menu: ContextMenuState;
  onClose: () => void;
}

export function ContextMenu({ menu, onClose }: ContextMenuProps) {
  return (
    <motion.div
      className="context-menu"
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 6 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      style={{ left: menu.x, top: menu.y }}
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
