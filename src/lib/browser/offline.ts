import type { BrowserFallbackState, OfflineNetworkStatus } from "@/lib/browser/types";

const OFFLINE_COPY: Record<OfflineNetworkStatus, { message: string; details: string }> = {
  "no-internet": {
    message: "You're not connected to the internet",
    details:
      "Check your network cables, modem and router, or reconnect to Wi-Fi. The page loads by itself once you're back online.",
  },
  "wifi-off": {
    message: "Wi-Fi is turned off",
    details: "Turn Wi-Fi on to browse the web. The page loads by itself once you're connected.",
  },
  airplane: {
    message: "Airplane mode is on",
    details: "Turn off airplane mode to browse the web. The page loads by itself once you're connected.",
  },
};

/**
 * The page a web address shows while the virtual device has no network:
 * airplane mode, Wi-Fi switched off, or a real outage. Local files and the
 * browser's own pages never need this, only remote sites do.
 */
export function buildOfflineFallback(url: string, status: OfflineNetworkStatus): BrowserFallbackState {
  const { message, details } = OFFLINE_COPY[status];

  return {
    title: "No internet",
    url,
    message,
    details,
    retryProxyMode: null,
    offlineStatus: status,
  };
}
