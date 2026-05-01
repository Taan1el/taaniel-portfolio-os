import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface ShortcutEntry {
  keys: string[];
  label: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Shell",
    shortcuts: [
      { keys: ["Shift", "Esc"], label: "Toggle Start menu" },
      { keys: ["Ctrl", "K"], label: "Open search / launcher" },
      { keys: ["Esc"], label: "Close overlays" },
      { keys: ["F11"], label: "Toggle fullscreen" },
      { keys: ["Shift", "F10"], label: "Open Terminal" },
      { keys: ["?"], label: "Show this cheatsheet" },
    ],
  },
  {
    title: "Windows",
    shortcuts: [
      { keys: ["Alt", "F4"], label: "Close active window" },
      { keys: ["Alt", "]"], label: "Focus next window" },
      { keys: ["Alt", "["], label: "Focus previous window" },
    ],
  },
  {
    title: "File Explorer",
    shortcuts: [
      { keys: ["Backspace"], label: "Go back" },
      { keys: ["Ctrl", "F"], label: "Search files" },
    ],
  },
  {
    title: "Calculator",
    shortcuts: [
      { keys: ["0–9"], label: "Enter digits" },
      { keys: ["+ − * /"], label: "Operators" },
      { keys: ["Enter"], label: "Calculate (=)" },
      { keys: ["Esc"], label: "Clear (AC)" },
      { keys: ["Backspace"], label: "Delete last digit" },
      { keys: ["%"], label: "Percent" },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return <kbd className="cheatsheet__kbd">{children}</kbd>;
}

interface ShortcutCheatsheetProps {
  open: boolean;
  onClose: () => void;
}

function CheatsheetInner({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="cheatsheet-overlay"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="cheatsheet"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="cheatsheet__header">
          <strong className="cheatsheet__title">Keyboard shortcuts</strong>
          <button className="cheatsheet__close" type="button" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="cheatsheet__grid">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title} className="cheatsheet__group">
              <h3 className="cheatsheet__group-title">{group.title}</h3>
              <ul className="cheatsheet__list">
                {group.shortcuts.map((s) => (
                  <li key={s.label} className="cheatsheet__item">
                    <span className="cheatsheet__item-label">{s.label}</span>
                    <span className="cheatsheet__item-keys">
                      {s.keys.map((k, i) => (
                        <span key={i}>
                          {i > 0 ? <span className="cheatsheet__plus">+</span> : null}
                          <Kbd>{k}</Kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="cheatsheet__footer">Press <Kbd>?</Kbd> or <Kbd>Esc</Kbd> to dismiss</p>
      </motion.div>
    </div>
  );
}

export function ShortcutCheatsheet({ open, onClose }: ShortcutCheatsheetProps) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open ? <CheatsheetInner onClose={onClose} /> : null}
    </AnimatePresence>,
    document.body
  );
}
