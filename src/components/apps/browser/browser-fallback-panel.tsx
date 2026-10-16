import { ExternalLink, Network, Plane, Settings, Wifi, WifiOff } from "lucide-react";
import { displayHost } from "@/components/apps/browser/site-badge";
import { proxyModeLabels } from "@/lib/browser/proxy";
import type { BrowserFallbackState, OfflineNetworkStatus } from "@/lib/browser/types";
import { useDeviceStore } from "@/stores/device-store";
import { useSystemStore } from "@/stores/system-store";

interface BrowserFallbackPanelProps {
  fallback: BrowserFallbackState;
  canOpenExternally: boolean;
  onOpenInNewTab: () => void;
  onRetryWithProxy: () => void;
}

/** What the visitor can do from the page itself: flip the switch that cut the network. */
const OFFLINE_FIXES: Record<OfflineNetworkStatus, { label: string; icon: typeof Wifi; apply: () => void } | null> = {
  airplane: {
    label: "Turn off airplane mode",
    icon: Plane,
    apply: () => useDeviceStore.getState().setAirplaneMode(false),
  },
  "wifi-off": {
    label: "Turn Wi-Fi on",
    icon: Wifi,
    apply: () => useDeviceStore.getState().setWifiEnabled(true),
  },
  // A real outage has no switch to flip; the page loads again once the connection returns.
  "no-internet": null,
};

/** Shown while the device is offline: airplane mode, Wi-Fi off, or a real outage. */
function BrowserOfflinePanel({ fallback, status }: { fallback: BrowserFallbackState; status: OfflineNetworkStatus }) {
  const launchApp = useSystemStore((state) => state.launchApp);
  const fix = OFFLINE_FIXES[status];

  return (
    <div className="w11-browser__error" role="alert">
      {status === "airplane" ? (
        <Plane className="w11-browser__error-art" size={72} strokeWidth={1.4} color="#8a8a8a" aria-hidden="true" />
      ) : (
        <WifiOff className="w11-browser__error-art" size={72} strokeWidth={1.4} color="#8a8a8a" aria-hidden="true" />
      )}
      <h2>{fallback.title}</h2>
      <p>{fallback.message}</p>
      {fallback.details ? <p className="w11-browser__error-details">{fallback.details}</p> : null}
      <code>{fallback.url}</code>
      <div className="w11-browser__error-actions">
        {fix ? (
          <button type="button" className="w11-button w11-button--accent" onClick={fix.apply}>
            <fix.icon size={14} aria-hidden="true" />
            {fix.label}
          </button>
        ) : null}
        <button
          type="button"
          className={fix ? "w11-button" : "w11-button w11-button--accent"}
          onClick={() => launchApp({ appId: "settings", payload: { section: "network" } })}
        >
          <Settings size={14} aria-hidden="true" />
          Network settings
        </button>
      </div>
    </div>
  );
}

/** Shown when a site refuses to be embedded, worded like a browser's own error page. */
export function BrowserFallbackPanel({ fallback, canOpenExternally, onOpenInNewTab, onRetryWithProxy }: BrowserFallbackPanelProps) {
  if (fallback.offlineStatus) {
    return <BrowserOfflinePanel fallback={fallback} status={fallback.offlineStatus} />;
  }

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
