import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getStoredDirectEmbedOutcome,
  rememberDirectEmbedOutcome,
  type BrowserEmbedOutcome,
} from "@/lib/browser/embed-memory";
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
  BrowserFallbackKind,
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

function getFallbackEyebrow(kind: BrowserFallbackKind) {
  switch (kind) {
    case "blocked":
      return "Known restriction";
    case "cached":
      return "Likely blocked";
    case "timeout":
      return "No response";
    case "error":
      return "Load failed";
    case "local":
      return "Local preview";
    default:
      return "Unavailable";
  }
}

function getFallbackRecommendation(kind: BrowserFallbackKind) {
  switch (kind) {
    case "blocked":
    case "cached":
      return "Open the live page externally or switch to a proxy preview.";
    case "timeout":
      return "Try again, switch to a proxy preview, or open the live page externally.";
    case "error":
      return "This page did not render cleanly in the Web Viewer. External open is the safest option.";
    case "local":
      return "Open the file with its native app or use File Explorer for a different preview path.";
    default:
      return "Try a different destination or return to a known local path.";
  }
}

function mapFailureReasonToFallbackKind(
  reason: BrowserFailureRecord["reason"],
): BrowserFallbackKind {
  switch (reason) {
    case "blocked":
      return "blocked";
    case "cached":
      return "cached";
    case "error":
      return "error";
    case "local":
      return "local";
    case "timeout":
      return "timeout";
    default:
      return "missing";
  }
}

function mapFailureReasonToEmbedOutcome(
  reason: BrowserFailureRecord["reason"],
): BrowserEmbedOutcome | null {
  switch (reason) {
    case "blocked":
      return "blocked";
    case "error":
      return "error";
    case "timeout":
      return "timeout";
    default:
      return null;
  }
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

      if (document.kind === "remote" && proxyMode === "direct") {
        const outcome = mapFailureReasonToEmbedOutcome(reason);

        if (outcome) {
          rememberDirectEmbedOutcome(document.displayUrl, outcome);
        }
      }
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
      const fallbackKind = mapFailureReasonToFallbackKind(reason);

      setViewMode("fallback");
      setLoadState("blocked");
      setFallback({
        kind: fallbackKind,
        eyebrow: getFallbackEyebrow(fallbackKind),
        recommendation: getFallbackRecommendation(fallbackKind),
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
        kind: "missing",
        eyebrow: "Unavailable",
        recommendation: "Try a different destination or return to a known local path.",
        title: currentUrl.startsWith("/")
          ? currentUrl.split("/").filter(Boolean).at(-1) ?? "Local file"
          : "Unable to open page",
        url: currentUrl,
        message: resolution.error ?? "This page could not be resolved.",
        details: currentUrl.startsWith("/")
          ? "The requested local file could not be rendered in the Web Viewer."
          : undefined,
        retryProxyMode: null,
      });
      return;
    }

    if (resolution.document.frameSource.kind === "srcDoc") {
      if (resolution.error) {
        activateFallback(
          resolution.error,
          "The requested local file could not be rendered in the Web Viewer.",
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
      const cachedOutcome = getStoredDirectEmbedOutcome(
        resolution.document.displayUrl,
      );

      if (cachedOutcome && cachedOutcome !== "ready") {
        activateFallback(
          "This site is likely to block the Web Viewer in direct mode",
          "The site failed recently on this device, so the viewer is skipping the dead iframe step and sending you straight to safer options.",
          "cached",
          getRetryProxyMode(proxyMode)
        );
        return;
      }

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
        "This site did not finish rendering in the Web Viewer",
        "The iframe did not finish loading before the timeout. Try opening the live page externally or switching to a different preview mode.",
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

    if (activeDocument?.kind === "remote" && proxyMode === "direct") {
      rememberDirectEmbedOutcome(activeDocument.displayUrl, "ready");
    }

    setViewMode("web");
    setLoadState("ready");
    setFallback(null);
  }, [activeDocument, clearLoadTimeout, proxyMode]);

  const handleFrameError = useCallback(() => {
    clearLoadTimeout();
    activateFallback(
      "This site reported a frame error in the Web Viewer",
      "The iframe reported a loading error. Try opening the live page externally or switching to a different preview mode.",
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
