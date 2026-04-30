import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useToastStore } from "@/stores/toast-store";
import type { ToastType } from "@/stores/toast-store";

const ICONS: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return createPortal(
    <div className="toast-container" aria-live="polite" aria-label="Notifications">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <motion.div
              key={t.id}
              className={`toast toast--${t.type}`}
              role="status"
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              <Icon size={13} className="toast__icon" aria-hidden="true" />
              <span className="toast__message">{t.message}</span>
              <button
                className="toast__dismiss"
                type="button"
                aria-label="Dismiss notification"
                onClick={() => removeToast(t.id)}
              >
                <X size={11} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
}
