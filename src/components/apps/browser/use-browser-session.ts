import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyProxy,
  getRetryProxyMode,
  proxyModeNotes,
  type ProxyMode,
} from "@/lib/browser/proxy";
import { resolveLocalBrowserDocument } from "@/lib/browser/local-file";
import { getBrowserTitleFromUrl, getUrlOrSearch } from "@/lib/browser/url";
import type {
  BrowserFailureRecord,
  BrowserFallbackState,
  BrowserLoadState,
  BrowserResolvedDocument,
  ViewMode,
} from "@/lib/browser/types";
import type { FileNode } from "@/types/system";

const DEFAULT_BROWSER_HOME = "https://duckduckgo.com/";
const REMOTE_EMBED_TIMEOUT_MS = 5000;
const FAILURE_HISTORY_LIMIT = 12;

interface UseBrowserSessionOptions {
  initialAddress?: string;
  readFile: (path: string) => FileNode | null;
}

interface BrowserResolution {
  document: BrowserResolvedDocument | null;
  error: string | null;
}

export function useBrowserSession({
  initialAddress,
  readFile,
}: UseBrowserSessionOptions) {
  const startingAddress = initialAddress?.trim() || DEFAULT_BROWSER_HOME;
  const [address, setAddress] = useState(startingAddress);
  const [history, setHistory] = useState<string[]>([startingAddress]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [proxyMode, setProxyMode] = useState<ProxyMode>("direct");
  const [viewMode, setViewMode] = useState<ViewMode>("web");
  const [loadState, setLoadState] = useState<BrowserLoadState>("idle");
  const [fallback, setFallback] = useState<BrowserFallbackState | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [failureHistory, setFailureHistory] = useState<BrowserFailureRecord[]>([]);

  useEffect(() => {
    setAddress(startingAddress);
    setHistory([startingAddress]);
    setHistoryIndex(0);
    setProxyMode("direct");
    setViewMode("web");
    setLoadState("idle");
    setFallback(null);
    setRefreshToken(0);
  }, [startingAddress]);

  const currentUrl = history[historyIndex] ?? startingAddress;

  useEffect(() => {
    setAddress(currentUrl);
  }, [currentUrl]);

  const resolution = useMemo<BrowserResolution>(() => {
    const localResolution = resolveLocalBrowserDocument(currentUrl, readFile);

    if (localResolution.document || localResolution.error) {
      return localResolution;
    }

    const processedUrl = getUrlOrSearch(currentUrl);

    return {
      document: {
        kind: "remote",
        title: getBrowserTitleFromUrl(processedUrl),
        displayUrl: processedUrl,
        note: proxyModeNotes[proxyMode],
        frameSource: {
          kind: "src",
          value: applyProxy(processedUrl, proxyMode),
        },
      },
      error: null,
    };
  }, [currentUrl, proxyMode, readFile]);

  const activeDocument = resolution.document;

  const recordFailure = useCallback(
    (reason: BrowserFailureRecord["reason"], document: BrowserResolvedDocument | null) => {
      if (!document) {
        return;
      }

      const nextRecord: BrowserFailureRecord = {
        url: document.displayUrl,
        proxyMode,
        reason,
        timestamp: Date.now(),
      };

      setFailureHistory((currentHistory) => [...currentHistory.slice(-(FAILURE_HISTORY_LIMIT - 1)), nextRecord]);
    },
    [proxyMode]
  );

  const activateFallback = useCallback(
    (message: string, details: string | undefined, reason: BrowserFailureRecord["reason"]) => {
      const title =
        activeDocument?.title ??
        (currentUrl.startsWith("/") ? currentUrl.split("/").filter(Boolean).at(-1) ?? currentUrl : getBrowserTitleFromUrl(getUrlOrSearch(currentUrl)));
      const url = activeDocument?.displayUrl ?? currentUrl;

      setViewMode("fallback");
      setLoadState("blocked");
      setFallback({
        title,
        url,
        message,
        details,
        retryProxyMode: activeDocument?.kind === "remote" ? getRetryProxyMode(proxyMode) : null,
      });
      recordFailure(reason, activeDocument);
    },
    [activeDocument, currentUrl, proxyMode, recordFailure]
  );

  useEffect(() => {
    if (!resolution.document) {
      setViewMode("fallback");
      setLoadState("blocked");
      setFallback({
        title: currentUrl.startsWith("/")
          ? currentUrl.split("/").filter(Boolean).at(-1) ?? "Local file"
          : "Unable to open page",
        url: currentUrl,
        message: resolution.error ?? "This page could not be resolved.",
        details: currentUrl.startsWith("/")
          ? "The requested local file could not be rendered in the Browser app."
          : undefined,
        retryProxyMode: null,
      });
      return;
    }

    if (resolution.document.frameSource.kind === "srcDoc") {
      if (resolution.error) {
        activateFallback(resolution.error, "The requested local file could not be rendered in the Browser app.", "local");
        return;
      }

      setViewMode("web");
      setLoadState("ready");
      setFallback(null);
      return;
    }

    setViewMode("web");
    setLoadState("loading");
    setFallback(null);

    const timeoutId = globalThis.window.setTimeout(() => {
      activateFallback(
        "This site cannot be embedded due to browser restrictions",
        "The iframe did not finish loading before the timeout. Try opening the page in a new tab or retrying with a different proxy mode.",
        "blocked"
      );
    }, REMOTE_EMBED_TIMEOUT_MS);

    return () => globalThis.window.clearTimeout(timeoutId);
  }, [activateFallback, currentUrl, refreshToken, resolution]);

  const resetViewForRetry = useCallback(() => {
    setViewMode("web");
    setLoadState("idle");
    setFallback(null);
  }, []);

  const visit = (nextAddress: string) => {
    const trimmed = nextAddress.trim();

    if (!trimmed) {
      return;
    }

    if (trimmed === currentUrl) {
      resetViewForRetry();
      setRefreshToken((current) => current + 1);
      return;
    }

    resetViewForRetry();
    setRefreshToken(0);
    setAddress(trimmed);
    setHistory((currentHistory) => [...currentHistory.slice(0, historyIndex + 1), trimmed]);
    setHistoryIndex(historyIndex + 1);
  };

  const goBack = () => {
    resetViewForRetry();
    setRefreshToken(0);
    setHistoryIndex((current) => Math.max(0, current - 1));
  };

  const goForward = () => {
    resetViewForRetry();
    setRefreshToken(0);
    setHistoryIndex((current) => Math.min(history.length - 1, current + 1));
  };

  const reload = () => {
    resetViewForRetry();
    setRefreshToken((current) => current + 1);
  };

  const changeProxyMode = (mode: ProxyMode) => {
    resetViewForRetry();
    setProxyMode(mode);
    setRefreshToken((current) => current + 1);
  };

  const retryWithProxy = () => {
    const nextProxyMode = fallback?.retryProxyMode ?? getRetryProxyMode(proxyMode);

    changeProxyMode(nextProxyMode);
  };

  const handleFrameLoad = () => {
    setViewMode("web");
    setLoadState("ready");
    setFallback(null);
  };

  const handleFrameError = () => {
    activateFallback(
      "This site cannot be embedded due to browser restrictions",
      "The iframe reported a loading error. Try opening the page in a new tab or retrying with a different proxy mode.",
      "error"
    );
  };

  return {
    address,
    setAddress,
    currentUrl,
    proxyMode,
    setProxyMode: changeProxyMode,
    viewMode,
    loadState,
    fallback,
    resolvedDocument: activeDocument,
    refreshToken,
    failureHistory,
    canGoBack: historyIndex > 0,
    canGoForward: historyIndex < history.length - 1,
    visit,
    goBack,
    goForward,
    reload,
    retryWithProxy,
    handleFrameLoad,
    handleFrameError,
  };
}
