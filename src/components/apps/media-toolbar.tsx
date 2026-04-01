import { ChevronLeft, ChevronRight } from "lucide-react";

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
    <header className="app-toolbar">
      <div className="app-toolbar__title">
        <strong>{title}</strong>
        {subtitle ? <small>{subtitle}</small> : null}
      </div>
      <div className="app-toolbar__group">
        {actions}
        <button type="button" className="icon-button" disabled={!canGoPrevious} onClick={onPrevious}>
          <ChevronLeft size={15} />
        </button>
        <button type="button" className="icon-button" disabled={!canGoNext} onClick={onNext}>
          <ChevronRight size={15} />
        </button>
      </div>
    </header>
  );
}
