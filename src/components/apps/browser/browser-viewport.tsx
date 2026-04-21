import { LoaderCircle } from "lucide-react";
import { BrowserFallbackPanel } from "@/components/apps/browser/browser-fallback-panel";
import type {
  BrowserFallbackState,
  BrowserLoadState,
  BrowserResolvedDocument,
  ViewMode,
} from "@/lib/browser/types";

interface BrowserViewportProps {
  document: BrowserResolvedDocument | null;
  viewMode: ViewMode;
  loadState: BrowserLoadState;
  fallback: BrowserFallbackState | null;
  refreshToken: number;
  canOpenExternally: boolean;
  onFrameLoad: () => void;
  onFrameError: () => void;
  onOpenInNewTab: () => void;
  onRetryWithProxy: () => void;
}

export function BrowserViewport({
  document,
  viewMode,
  loadState,
  fallback,
  refreshToken,
  canOpenExternally,
  onFrameLoad,
  onFrameError,
  onOpenInNewTab,
  onRetryWithProxy,
}: BrowserViewportProps) {
  if (viewMode === "fallback") {
    const fallbackState = fallback ?? {
      title: document?.title ?? "Unable to open page",
      url: document?.displayUrl ?? "No URL available",
      message: "This site cannot be embedded due to browser restrictions",
    };

    return (
      <BrowserFallbackPanel
        fallback={fallbackState}
        canOpenExternally={canOpenExternally}
        onOpenInNewTab={onOpenInNewTab}
        onRetryWithProxy={onRetryWithProxy}
      />
    );
  }

  if (!document) {
    return (
      <BrowserFallbackPanel
        fallback={{
          title: "Unable to open page",
          url: "No URL available",
          message: "This site cannot be embedded due to browser restrictions",
        }}
        canOpenExternally={canOpenExternally}
        onOpenInNewTab={onOpenInNewTab}
        onRetryWithProxy={onRetryWithProxy}
      />
    );
  }

  return (
    <div className="browser-app__frame-shell" data-state={loadState}>
      {loadState === "loading" ? (
        <div className="browser-app__loading-bar" aria-hidden="true">
          <span />
        </div>
      ) : null}

      {loadState === "loading" ? (
        <div className="browser-app__hint">
          <span className="browser-app__hint-heading">
            <LoaderCircle size={14} />
            <strong>Loading page</strong>
          </span>
          <p>
            The Browser app renders through an iframe. If the page fails or stalls, it switches to
            a transparent fallback instead of leaving a blank panel.
          </p>
        </div>
      ) : null}

      <iframe
        key={`${document.displayUrl}:${document.frameSource.kind}:${document.frameSource.value}:${refreshToken}`}
        src={document.frameSource.kind === "src" ? document.frameSource.value : undefined}
        srcDoc={document.frameSource.kind === "srcDoc" ? document.frameSource.value : undefined}
        title={document.title}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerPolicy="no-referrer"
        onLoad={onFrameLoad}
        onError={onFrameError}
      />
    </div>
  );
}
