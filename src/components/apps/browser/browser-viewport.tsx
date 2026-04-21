import { ExternalLink, Globe2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/apps/app-layout";
import type { BrowserResolvedDocument } from "@/lib/browser/types";

interface BrowserViewportProps {
  document: BrowserResolvedDocument | null;
  loading: boolean;
  error: string | null;
  refreshToken: number;
  canOpenExternally: boolean;
  onFrameLoad: () => void;
  onFrameError: () => void;
  onOpenInNewTab: () => void;
  onOpenHome: () => void;
}

export function BrowserViewport({
  document,
  loading,
  error,
  refreshToken,
  canOpenExternally,
  onFrameLoad,
  onFrameError,
  onOpenInNewTab,
  onOpenHome,
}: BrowserViewportProps) {
  if (!document || error) {
    return (
      <div className="browser-app__fallback">
        <span className="browser-app__fallback-icon">
          <ShieldAlert size={22} />
        </span>
        <div className="browser-app__fallback-copy">
          <p className="eyebrow">Browser status</p>
          <h2>{document?.title ?? "Unable to open page"}</h2>
          <p>{error ?? "This page could not be resolved."}</p>
          <code>{document?.displayUrl ?? "No URL available"}</code>
        </div>
        <div className="browser-app__fallback-actions">
          <Button type="button" variant="panel" onClick={onOpenInNewTab} disabled={!canOpenExternally}>
            <ExternalLink size={15} />
            Open in new tab
          </Button>
          <Button type="button" variant="ghost" onClick={onOpenHome}>
            <Globe2 size={15} />
            Open home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="browser-app__frame-shell" data-state={loading ? "loading" : "ready"}>
      {loading ? (
        <div className="browser-app__hint">
          <strong>Loading page</strong>
          <p>
            The Browser app renders through an iframe. If this stays blank, the site likely blocks
            framing and should be opened in a new tab.
          </p>
        </div>
      ) : null}

      <iframe
        key={`${document.displayUrl}:${document.frameSource.kind}:${refreshToken}`}
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
