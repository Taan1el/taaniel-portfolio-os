import type { ProxyMode } from "@/lib/browser/proxy";

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
  title: string;
  displayUrl: string;
  note: string;
  frameSource: BrowserFrameSource;
}

export interface BrowserFallbackState {
  title: string;
  url: string;
  message: string;
  details?: string;
  retryProxyMode?: ProxyMode | null;
}

export interface BrowserFailureRecord {
  url: string;
  proxyMode: ProxyMode;
  reason: "blocked" | "error" | "local";
  timestamp: number;
}
