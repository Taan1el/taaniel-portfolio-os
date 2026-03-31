import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import type { StartMenuShortcut } from "@/types/system";
import { StartPowerSection } from "@/components/shell/start-menu/start-power-section";
import { updateStartMenuSpotlight } from "@/components/shell/start-menu/spotlight";

interface StartSidebarProps {
  expanded: boolean;
  shortcuts: StartMenuShortcut[];
  powerActions: StartMenuShortcut[];
  onToggleExpanded: () => void;
  onHoverExpandedChange: (expanded: boolean) => void;
  onExecuteAction: (shortcut: StartMenuShortcut) => void;
}

export function StartSidebar({
  expanded,
  shortcuts,
  powerActions,
  onToggleExpanded,
  onHoverExpandedChange,
  onExecuteAction,
}: StartSidebarProps) {
  return (
    <motion.div
      className="start-menu__rail"
      animate={{ width: expanded ? 228 : 72 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => onHoverExpandedChange(true)}
      onMouseLeave={() => onHoverExpandedChange(false)}
    >
      <button
        type="button"
        className="start-menu__rail-toggle"
        onClick={onToggleExpanded}
        onMouseMove={updateStartMenuSpotlight}
      >
        {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        <span>Quick links</span>
      </button>

      <div className="start-menu__rail-group">
        {shortcuts.map((shortcut) => {
          const Icon = shortcut.icon;

          return (
            <button
              key={shortcut.id}
              type="button"
              className="start-menu__rail-item"
              onClick={() => onExecuteAction(shortcut)}
              onMouseMove={updateStartMenuSpotlight}
            >
              <Icon size={16} />
              <span>{shortcut.label}</span>
            </button>
          );
        })}
      </div>

      <StartPowerSection actions={powerActions} onExecuteAction={onExecuteAction} />
    </motion.div>
  );
}
