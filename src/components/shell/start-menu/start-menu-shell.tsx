import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StartMenuShellProps {
  children: React.ReactNode;
  menuRef: React.RefObject<HTMLElement>;
  className?: string;
}

export function StartMenuShell({ children, menuRef, className }: StartMenuShellProps) {
  return (
    <motion.aside
      ref={menuRef}
      className={cn("start-menu", "app-scaffold", className)}
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.aside>
  );
}
