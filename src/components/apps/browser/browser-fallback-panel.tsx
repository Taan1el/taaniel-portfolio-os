import { ExternalLink, Network } from "lucide-react";
import { displayHost } from "@/components/apps/browser/site-badge";
import { proxyModeLabels } from "@/lib/browser/proxy";
import type { BrowserFallbackState } from "@/lib/browser/types";

interface BrowserFallbackPanelProps {
  fallback: BrowserFallbackState;
  canOpenExternally: boolean;
  onOpenInNewTab: () => void;
  onRetryWithProxy: () => void;
}

/** Shown when a site refuses to be embedded, worded like a browser's own error page. */
export function BrowserFallbackPanel({ fallback, canOpenExternally, onOpenInNewTab, onRetryWithProxy }: BrowserFallbackPanelProps) {
  const host = displayHost(fallback.url);

  return (
    <div className="w11-browser__error" role="alert">
      <svg className="w11-browser__error-art" width="72" height="72" viewBox="0 0 48 48" aria-hidden="true">
        <rect x="6" y="10" width="36" height="28" rx="4" fill="#3a3a3a" />
        <rect x="6" y="10" width="36" height="7" rx="3" fill="#4a4a4a" />
        <circle cx="11" cy="13.5" r="1.4" fill="#8a8a8a" />
        <circle cx="15.5" cy="13.5" r="1.4" fill="#8a8a8a" />
        <path d="M18 24l12 10M30 24L18 34" stroke="#8a8a8a" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <h2>{canOpenExternally ? `${host} refused to connect inside this window` : fallback.title}</h2>
      <p>{fallback.message}</p>
      {fallback.details ? <p className="w11-browser__error-details">{fallback.details}</p> : null}
      <code>{fallback.url}</code>
      <div className="w11-browser__error-actions">
        <button type="button" className="w11-button w11-button--accent" onClick={onOpenInNewTab} disabled={!canOpenExternally}>
          <ExternalLink size={14} aria-hidden="true" />
          Open in your browser
        </button>
        <button type="button" className="w11-button" onClick={onRetryWithProxy} disabled={!fallback.retryProxyMode}>
          <Network size={14} aria-hidden="true" />
          {fallback.retryProxyMode ? `Try ${proxyModeLabels[fallback.retryProxyMode]}` : "Try a proxy"}
        </button>
      </div>
    </div>
  );
}
