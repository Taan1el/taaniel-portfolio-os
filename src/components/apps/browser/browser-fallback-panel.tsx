import { ExternalLink, Network, ShieldAlert } from "lucide-react";
import { Button } from "@/components/apps/app-layout";
import type { BrowserFallbackState } from "@/lib/browser/types";

interface BrowserFallbackPanelProps {
  fallback: BrowserFallbackState;
  canOpenExternally: boolean;
  onOpenInNewTab: () => void;
  onRetryWithProxy: () => void;
}

export function BrowserFallbackPanel({
  fallback,
  canOpenExternally,
  onOpenInNewTab,
  onRetryWithProxy,
}: BrowserFallbackPanelProps) {
  return (
    <div className="browser-app__fallback">
      <span className="browser-app__fallback-icon">
        <ShieldAlert size={22} />
      </span>
      <div className="browser-app__fallback-copy">
        <p className="eyebrow">Fallback viewer</p>
        <h2>{fallback.title}</h2>
        <p>{fallback.message}</p>
        {fallback.details ? <small>{fallback.details}</small> : null}
        <code>{fallback.url}</code>
      </div>
      <div className="browser-app__fallback-actions">
        <Button type="button" variant="panel" onClick={onOpenInNewTab} disabled={!canOpenExternally}>
          <ExternalLink size={15} />
          Open in new tab
        </Button>
        <Button type="button" variant="ghost" onClick={onRetryWithProxy} disabled={!fallback.retryProxyMode}>
          <Network size={15} />
          Retry with proxy
        </Button>
      </div>
    </div>
  );
}
