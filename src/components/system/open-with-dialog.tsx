import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { getAppDefinition } from "@/lib/app-registry";
import { getOpenWithOptions } from "@/lib/file-registry";
import type { AppId, VirtualNode } from "@/types/system";

interface OpenWithDialogProps {
  filePath: string;
  node: VirtualNode;
  onOpen: (appId: AppId) => void;
  onClose: () => void;
}

function OpenWithDialogInner({ filePath, node, onOpen, onClose }: OpenWithDialogProps) {
  const options = getOpenWithOptions(node);
  const fileName = filePath.split("/").pop() ?? filePath;

  return (
    <div className="open-with-overlay" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        className="open-with-dialog"
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="open-with-dialog__header">
          <strong className="open-with-dialog__title">Open with</strong>
          <small className="open-with-dialog__subtitle">{fileName}</small>
        </div>
        <ul className="open-with-dialog__list">
          {options.map((appId) => {
            const def = getAppDefinition(appId);
            const Icon = def.icon;
            return (
              <li key={appId}>
                <button
                  className="open-with-dialog__item"
                  type="button"
                  onClick={() => { onOpen(appId); onClose(); }}
                >
                  <span className="open-with-dialog__item-icon" style={{ color: def.accent }}>
                    <Icon size={18} />
                  </span>
                  <span className="open-with-dialog__item-label">{def.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="open-with-dialog__footer">
          <button className="open-with-dialog__cancel" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface OpenWithDialogPortalProps {
  target: { filePath: string; node: VirtualNode } | null;
  onOpen: (appId: AppId) => void;
  onClose: () => void;
}

export function OpenWithDialog({ target, onOpen, onClose }: OpenWithDialogPortalProps) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {target ? (
        <OpenWithDialogInner
          key={target.filePath}
          filePath={target.filePath}
          node={target.node}
          onOpen={onOpen}
          onClose={onClose}
        />
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
