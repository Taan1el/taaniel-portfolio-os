import type { ReactNode } from "react";
import { AppContent, AppFooter, AppScaffold, AppToolbar } from "@/components/apps/app-layout";
import { cn } from "@/lib/utils";

interface ArcadeGameShellProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function ArcadeGameShell({
  title,
  subtitle,
  actions,
  footer,
  className,
  contentClassName,
  children,
}: ArcadeGameShellProps) {
  return (
    <AppScaffold className={cn("arcade-game-shell", className)}>
      <AppToolbar className="arcade-game-shell__toolbar">
        <div className="app-toolbar__title">
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </div>
        {actions ? <div className="app-toolbar__group arcade-game-shell__actions">{actions}</div> : null}
      </AppToolbar>

      <AppContent
        className={cn("arcade-game-shell__content", contentClassName)}
        padded={false}
        scrollable={false}
        stacked={false}
      >
        {children}
      </AppContent>

      {footer ? <AppFooter className="arcade-game-shell__footer">{footer}</AppFooter> : null}
    </AppScaffold>
  );
}
