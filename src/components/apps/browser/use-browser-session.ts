import { useEffect, useMemo, useState } from "react";
import {
  applyProxy,
  proxyModeNotes,
  type ProxyMode,
} from "@/lib/browser/proxy";
import { resolveLocalBrowserDocument } from "@/lib/browser/local-file";
import { getBrowserTitleFromUrl, getUrlOrSearch } from "@/lib/browser/url";
import type { BrowserResolvedDocument } from "@/lib/browser/types";
import type { FileNode } from "@/types/system";

const DEFAULT_BROWSER_HOME = "https://duckduckgo.com/";
const REMOTE_EMBED_TIMEOUT_MS = 7000;

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    setAddress(startingAddress);
    setHistory([startingAddress]);
    setHistoryIndex(0);
    setProxyMode("direct");
    setLoading(false);
    setError(null);
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

  useEffect(() => {
    setError(resolution.error);

    if (!resolution.document) {
      setLoading(false);
      return;
    }

    if (resolution.document.frameSource.kind === "srcDoc") {
      setLoading(false);
      return;
    }

    setLoading(true);

    const timeoutId = globalThis.window.setTimeout(() => {
      setLoading(false);
      setError("This site could not be embedded. Open it in a new tab or try another proxy mode.");
    }, REMOTE_EMBED_TIMEOUT_MS);

    return () => globalThis.window.clearTimeout(timeoutId);
  }, [resolution, refreshToken]);

  const visit = (nextAddress: string) => {
    const trimmed = nextAddress.trim();

    if (!trimmed) {
      return;
    }

    if (trimmed === currentUrl) {
      setError(null);
      setRefreshToken((current) => current + 1);
      return;
    }

    setError(null);
    setLoading(false);
    setRefreshToken(0);
    setAddress(trimmed);
    setHistory((currentHistory) => [...currentHistory.slice(0, historyIndex + 1), trimmed]);
    setHistoryIndex(historyIndex + 1);
  };

  const goBack = () => {
    setError(null);
    setRefreshToken(0);
    setHistoryIndex((current) => Math.max(0, current - 1));
  };

  const goForward = () => {
    setError(null);
    setRefreshToken(0);
    setHistoryIndex((current) => Math.min(history.length - 1, current + 1));
  };

  const reload = () => {
    setError(null);
    setRefreshToken((current) => current + 1);
  };

  const handleFrameLoad = () => {
    setLoading(false);
  };

  const handleFrameError = () => {
    setLoading(false);
    setError("This site could not be embedded. Open it in a new tab or try another proxy mode.");
  };

  return {
    address,
    setAddress,
    currentUrl,
    proxyMode,
    setProxyMode,
    loading,
    error,
    resolvedDocument: resolution.document,
    refreshToken,
    canGoBack: historyIndex > 0,
    canGoForward: historyIndex < history.length - 1,
    visit,
    goBack,
    goForward,
    reload,
    handleFrameLoad,
    handleFrameError,
  };
}
