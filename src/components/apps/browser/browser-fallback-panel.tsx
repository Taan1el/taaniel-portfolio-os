import { useEffect, useState } from "react";
import { Copy, ExternalLink, HelpCircle, Network, ShieldAlert } from "lucide-react";
import { Button } from "@/components/apps/app-layout";
import { proxyModeLabels } from "@/lib/browser/proxy";
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDetailsOpen(false);
    setCopied(false);
  }, [fallback]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fallback.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const retryLabel = fallback.retryProxyMode
    ? fallback.retryProxyMode === "wayback"
      ? "Try archived copy"
      : "Try proxy preview"
    : "Try proxy preview";

  return (
    <div className="browser-app__fallback">
      <span className="browser-app__fallback-icon">
        <ShieldAlert size={22} />
      </span>
      <div className="browser-app__fallback-copy">
        <p className="eyebrow">{fallback.eyebrow}</p>
        <h2>{fallback.title}</h2>
        <p>{fallback.message}</p>
        <small>{fallback.recommendation}</small>
        {detailsOpen && fallback.details ? (
          <div className="browser-app__fallback-details" role="note">
            {fallback.details}
          </div>
        ) : null}
        <code>{fallback.url}</code>
      </div>
      <div className="browser-app__fallback-actions">
        <Button type="button" variant="panel" onClick={onOpenInNewTab} disabled={!canOpenExternally}>
          <ExternalLink size={15} />
          Open externally
        </Button>
        <Button type="button" variant="ghost" onClick={onRetryWithProxy} disabled={!fallback.retryProxyMode}>
          <Network size={15} />
          {fallback.retryProxyMode ? retryLabel : "Retry with proxy"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => void handleCopy()}>
          <Copy size={15} />
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setDetailsOpen((current) => !current)}
          disabled={!fallback.details}
        >
          <HelpCircle size={15} />
          {detailsOpen ? "Hide reason" : "Why this failed"}
        </Button>
      </div>
      {fallback.retryProxyMode ? (
        <p className="browser-app__fallback-footnote">
          Suggested next mode: {proxyModeLabels[fallback.retryProxyMode]}
        </p>
      ) : null}
    </div>
  );
}
