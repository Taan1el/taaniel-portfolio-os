import type { ProxyMode } from "@/lib/browser/proxy";
import type { NetworkStatus } from "@/lib/device-status";

export interface BrowserBookmark {
  label: string;
  url: string;
}

export type ViewMode = "web" | "fallback";
export type BrowserLoadState = "idle" | "loading" | "ready" | "blocked";

export type BrowserFrameSource =
  | {
      kind: "src";
      value: string;
    }
  | {
      kind: "srcDoc";
      value: string;
    };

export interface BrowserResolvedDocument {
  kind: "remote" | "local";
  localKind?: "file" | "directory";
  title: string;
  displayUrl: string;
  note: string;
  frameSource: BrowserFrameSource;
}

/** Why the virtual device has no network; "connected" never reaches the Browser's offline page. */
export type OfflineNetworkStatus = Exclude<NetworkStatus, "connected">;

export interface BrowserFallbackState {
  title: string;
  url: string;
  message: string;
  details?: string;
  retryProxyMode?: ProxyMode | null;
  /** Set when the page is not blocked by the site but by the device being offline. */
  offlineStatus?: OfflineNetworkStatus;
}

export interface BrowserFailureRecord {
  url: string;
  proxyMode: ProxyMode;
  reason: "blocked" | "error" | "local" | "timeout";
  timestamp: number;
}
