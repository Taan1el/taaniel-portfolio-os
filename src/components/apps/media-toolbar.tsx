import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppToolbar, IconButton } from "@/components/apps/app-layout";

interface MediaToolbarProps {
  title: string;
  subtitle?: string;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  actions?: React.ReactNode;
}

export function MediaToolbar({
  title,
  subtitle,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  actions,
}: MediaToolbarProps) {
  return (
    <AppToolbar className="app-toolbar">
      <div className="app-toolbar__title">
        <strong>{title}</strong>
        {subtitle ? <small>{subtitle}</small> : null}
      </div>
      <div className="app-toolbar__group">
        {actions}
        <IconButton type="button" disabled={!canGoPrevious} onClick={onPrevious} aria-label="Previous item">
          <ChevronLeft size={15} />
        </IconButton>
        <IconButton type="button" disabled={!canGoNext} onClick={onNext} aria-label="Next item">
          <ChevronRight size={15} />
        </IconButton>
      </div>
    </AppToolbar>
  );
}
