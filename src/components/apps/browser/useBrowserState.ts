import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBrowserHostRule, isLikelyEmbeddable } from "@/lib/browser/host-rules";
import {
  applyProxy,
  getRetryProxyMode,
  proxyModeNotes,
  type ProxyMode,
} from "@/lib/browser/proxy";
import { resolveLocalBrowserDocument } from "@/lib/browser/local-file";
import {
  DEFAULT_BROWSER_HOME,
  getBrowserTitleFromUrl,
  getUrlOrSearch,
  normalizeBrowserAddress,
} from "@/lib/browser/urlUtils";
import type {
  BrowserFailureRecord,
  BrowserFallbackState,
  BrowserLoadState,
  BrowserResolvedDocument,
  ViewMode,
} from "@/lib/browser/types";
import type { FileSystemRecord } from "@/types/system";

const REMOTE_EMBED_TIMEOUT_MS = 9000;
const FAILURE_HISTORY_LIMIT = 12;

interface UseBrowserStateOptions {
  initialAddress?: string;
  nodes: FileSystemRecord;
}

interface BrowserResolution {
  document: BrowserResolvedDocument | null;
  error: string | null;
}

export function useBrowserState({ initialAddress, nodes }: UseBrowserStateOptions) {
  const normalizedInitialAddress = normalizeBrowserAddress(initialAddress ?? "");
  const startingAddress = normalizedInitialAddress || DEFAULT_BROWSER_HOME;
  const [address, setAddress] = useState(startingAddress);
  const [history, setHistory] = useState<string[]>([startingAddress]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [proxyMode, setProxyMode] = useState<ProxyMode>("direct");
  const [viewMode, setViewMode] = useState<ViewMode>("web");
  const [loadState, setLoadState] = useState<BrowserLoadState>("idle");
  const [fallback, setFallback] = useState<BrowserFallbackState | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [failureHistory, setFailureHistory] = useState<BrowserFailureRecord[]>([]);
  const loadTimeoutRef = useRef<number | null>(null);

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current != null) {
      globalThis.window.clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearLoadTimeout();
    setAddress(startingAddress);
    setHistory([startingAddress]);
    setHistoryIndex(0);
    setProxyMode("direct");
    setViewMode("web");
    setLoadState("idle");
    setFallback(null);
    setRefreshToken(0);
    setFailureHistory([]);
  }, [clearLoadTimeout, startingAddress]);

  const currentUrl = history[historyIndex] ?? startingAddress;

  useEffect(() => {
    setAddress(currentUrl);
  }, [currentUrl]);

  const resolution = useMemo<BrowserResolution>(() => {
    const localResolution = resolveLocalBrowserDocument(currentUrl, nodes);

    if (localResolution.document || localResolution.error) {
      return localResolution;
    }

    const processedUrl = getUrlOrSearch(currentUrl);
    const hostRule = getBrowserHostRule(processedUrl);

    return {
      document: {
        kind: "remote",
        title: getBrowserTitleFromUrl(processedUrl),
        displayUrl: processedUrl,
        note: proxyMode === "direct" ? hostRule.note ?? proxyModeNotes[proxyMode] : proxyModeNotes[proxyMode],
        frameSource: {
          kind: "src",
          value: applyProxy(processedUrl, proxyMode),
        },
      },
      error: null,
    };
  }, [currentUrl, nodes, proxyMode]);

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

      setFailureHistory((currentHistory) => [
        ...currentHistory.slice(-(FAILURE_HISTORY_LIMIT - 1)),
        nextRecord,
      ]);
    },
    [proxyMode]
  );

  const activateFallback = useCallback(
    (
      message: string,
      details: string | undefined,
      reason: BrowserFailureRecord["reason"],
      retryProxyModeOverride?: ProxyMode | null
    ) => {
      clearLoadTimeout();
      const title =
        activeDocument?.title ??
        (currentUrl.startsWith("/")
          ? currentUrl.split("/").filter(Boolean).at(-1) ?? currentUrl
          : getBrowserTitleFromUrl(getUrlOrSearch(currentUrl)));
      const url = activeDocument?.displayUrl ?? currentUrl;

      setViewMode("fallback");
      setLoadState("blocked");
      setFallback({
        title,
        url,
        message,
        details,
        retryProxyMode:
          activeDocument?.kind === "remote"
            ? retryProxyModeOverride ?? getRetryProxyMode(proxyMode)
            : null,
      });
      recordFailure(reason, activeDocument);
    },
    [activeDocument, clearLoadTimeout, currentUrl, proxyMode, recordFailure]
  );

  useEffect(() => {
    clearLoadTimeout();

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
        activateFallback(
          resolution.error,
          "The requested local file could not be rendered in the Browser app.",
          "local"
        );
        return;
      }

      setViewMode("web");
      setLoadState("ready");
      setFallback(null);
      return;
    }

    if (resolution.document.kind === "remote" && proxyMode === "direct") {
      const hostRule = getBrowserHostRule(resolution.document.displayUrl);

      if (!isLikelyEmbeddable(resolution.document.displayUrl) && hostRule.disposition === "blocked") {
        activateFallback(
          hostRule.message ?? "This site is restricted and cannot be embedded",
          hostRule.details,
          "blocked",
          hostRule.retryProxyMode ?? getRetryProxyMode(proxyMode)
        );
        return;
      }
    }

    setViewMode("web");
    setLoadState("loading");
    setFallback(null);

    loadTimeoutRef.current = globalThis.window.setTimeout(() => {
      activateFallback(
        "This site cannot be embedded due to browser restrictions",
        "The iframe did not finish loading before the timeout. Try opening the page in a new tab or retrying with a different proxy mode.",
        "timeout"
      );
    }, REMOTE_EMBED_TIMEOUT_MS);

    return () => clearLoadTimeout();
  }, [activateFallback, clearLoadTimeout, currentUrl, proxyMode, refreshToken, resolution]);

  const resetViewForRetry = useCallback(() => {
    clearLoadTimeout();
    setViewMode("web");
    setLoadState("idle");
    setFallback(null);
  }, [clearLoadTimeout]);

  const visit = useCallback(
    (nextAddress: string) => {
      const normalizedAddress = normalizeBrowserAddress(nextAddress);

      if (!normalizedAddress) {
        return;
      }

      if (normalizedAddress === currentUrl) {
        resetViewForRetry();
        setRefreshToken((current) => current + 1);
        return;
      }

      resetViewForRetry();
      setRefreshToken(0);
      setAddress(normalizedAddress);
      setHistory((currentHistory) => [
        ...currentHistory.slice(0, historyIndex + 1),
        normalizedAddress,
      ]);
      setHistoryIndex(historyIndex + 1);
    },
    [currentUrl, historyIndex, resetViewForRetry]
  );

  const goBack = useCallback(() => {
    resetViewForRetry();
    setRefreshToken(0);
    setHistoryIndex((current) => Math.max(0, current - 1));
  }, [resetViewForRetry]);

  const goForward = useCallback(() => {
    resetViewForRetry();
    setRefreshToken(0);
    setHistoryIndex((current) => Math.min(history.length - 1, current + 1));
  }, [history.length, resetViewForRetry]);

  const reload = useCallback(() => {
    resetViewForRetry();
    setRefreshToken((current) => current + 1);
  }, [resetViewForRetry]);

  const changeProxyMode = useCallback(
    (mode: ProxyMode) => {
      resetViewForRetry();
      setProxyMode(mode);
      setRefreshToken((current) => current + 1);
    },
    [resetViewForRetry]
  );

  const retryWithProxy = useCallback(() => {
    const nextProxyMode = fallback?.retryProxyMode ?? getRetryProxyMode(proxyMode);

    changeProxyMode(nextProxyMode);
  }, [changeProxyMode, fallback?.retryProxyMode, proxyMode]);

  const handleFrameLoad = useCallback(() => {
    clearLoadTimeout();
    setViewMode("web");
    setLoadState("ready");
    setFallback(null);
  }, [clearLoadTimeout]);

  const handleFrameError = useCallback(() => {
    clearLoadTimeout();
    activateFallback(
      "This site cannot be embedded due to browser restrictions",
      "The iframe reported a loading error. Try opening the page in a new tab or retrying with a different proxy mode.",
      "error"
    );
  }, [activateFallback, clearLoadTimeout]);

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
