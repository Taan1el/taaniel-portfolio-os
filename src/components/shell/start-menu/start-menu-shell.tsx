import { motion } from "framer-motion";

interface StartMenuShellProps {
  children: React.ReactNode;
  menuRef: React.RefObject<HTMLElement>;
}

export function StartMenuShell({ children, menuRef }: StartMenuShellProps) {
  return (
    <motion.aside
      ref={menuRef}
      className="start-menu app-scaffold"
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.aside>
  );
}
