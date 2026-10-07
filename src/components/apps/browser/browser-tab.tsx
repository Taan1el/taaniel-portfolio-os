import { useCallback, useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Check, Copy, ExternalLink, History, Plus } from "lucide-react";
import { HistoryPage, NewTabPage } from "@/components/apps/browser/internal-pages";
import { SiteBadge } from "@/components/apps/browser/site-badge";
import { BrowserToolbar, type SiteSecurity } from "@/components/apps/browser/browser-toolbar";
import { BrowserViewport } from "@/components/apps/browser/browser-viewport";
import { useBrowserState } from "@/components/apps/browser/useBrowserState";
import type { ProxyMode } from "@/lib/browser/proxy";
import { getBrowserTitleFromUrl, HISTORY_URL, NEW_TAB_URL } from "@/lib/browser/urlUtils";
import { cn } from "@/lib/utils";
import { useBrowserStore } from "@/stores/browser-store";
import { useShellStore } from "@/stores/shell-store";
import type { ContextMenuAction, FileSystemRecord } from "@/types/system";

export interface BrowserTabMeta {
  title: string;
  url: string;
  loading: boolean;
}

interface BrowserTabProps {
  tabId: string;
  active: boolean;
  initialAddress: string;
  nodes: FileSystemRecord;
  onMeta: (tabId: string, meta: BrowserTabMeta) => void;
  onNewTab: (address?: string) => void;
}

const PROXY_OPTIONS: Array<{ mode: ProxyMode; label: string }> = [
  { mode: "direct", label: "Load directly" },
  { mode: "allorigins", label: "Load through the AllOrigins proxy" },
  { mode: "wayback", label: "Load from the Web Archive" },
];

/** One browser tab: its own history, toolbar and page. Hidden tabs stay mounted so their pages keep running. */
export function BrowserTab({ tabId, active, initialAddress, nodes, onMeta, onNewTab }: BrowserTabProps) {
  const {
    address,
    setAddress,
    currentUrl,
    proxyMode,
    setProxyMode,
    viewMode,
    loadState,
    fallback,
    resolvedDocument,
    isInternal,
    refreshToken,
    canGoBack,
    canGoForward,
    visit,
    goBack,
    goForward,
    reload,
    retryWithProxy,
    handleFrameLoad,
    handleFrameError,
  } = useBrowserState({ initialAddress, nodes });

  const favorites = useBrowserStore((state) => state.favorites);
  const toggleFavorite = useBrowserStore((state) => state.toggleFavorite);
  const recordVisit = useBrowserStore((state) => state.recordVisit);
  const setContextMenu = useShellStore((state) => state.setContextMenu);
  const [focusAddressNonce, setFocusAddressNonce] = useState(0);

  const remoteUrl = resolvedDocument?.kind === "remote" ? resolvedDocument.displayUrl : null;
  const title = isInternal ? getBrowserTitleFromUrl(currentUrl) : resolvedDocument?.title ?? getBrowserTitleFromUrl(currentUrl);
  const isFavorite = Boolean(remoteUrl && favorites.some((favorite) => favorite.url === remoteUrl));
  const security: SiteSecurity = isInternal
    ? "internal"
    : resolvedDocument?.kind === "local"
      ? "local"
      : remoteUrl?.startsWith("https:")
        ? "secure"
        : "insecure";

  useEffect(() => {
    onMeta(tabId, { title, url: currentUrl, loading: loadState === "loading" });
  }, [currentUrl, loadState, onMeta, tabId, title]);

  // Each web page lands in History once per navigation.
  useEffect(() => {
    if (remoteUrl) recordVisit(remoteUrl, title);
  }, [recordVisit, remoteUrl, title]);

  const openExternally = useCallback(() => {
    // Only ever a normalized http(s) URL, opened without a referrer or a handle back to this page.
    if (remoteUrl) globalThis.open(remoteUrl, "_blank", "noopener,noreferrer");
  }, [remoteUrl]);

  const toggleCurrentFavorite = () => {
    if (remoteUrl) toggleFavorite({ url: remoteUrl, label: title });
  };

  const openMenu = (event: MouseEvent<HTMLButtonElement>) => {
    // The desktop closes menus on click; keep this click from reaching it.
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const actions: ContextMenuAction[] = [
      { id: "new-tab", label: "New tab", icon: Plus, onSelect: () => onNewTab() },
      { id: "history", label: "History", icon: History, shortcut: "Ctrl+H", onSelect: () => visit(HISTORY_URL) },
      { id: "sep-1", label: "", separator: true, onSelect: () => {} },
      { id: "external", label: "Open in your browser", icon: ExternalLink, disabled: !remoteUrl, onSelect: openExternally },
      {
        id: "copy-link",
        label: "Copy link",
        icon: Copy,
        disabled: !remoteUrl,
        onSelect: () => {
          if (remoteUrl) void navigator.clipboard?.writeText(remoteUrl).catch(() => undefined);
        },
      },
      { id: "sep-2", label: "", separator: true, onSelect: () => {} },
      ...PROXY_OPTIONS.map<ContextMenuAction>((option) => ({
        id: `proxy-${option.mode}`,
        label: option.label,
        icon: proxyMode === option.mode ? Check : undefined,
        disabled: !remoteUrl,
        onSelect: () => setProxyMode(option.mode),
      })),
    ];
    setContextMenu({ x: rect.right - 260, y: rect.bottom + 4, title: "Settings and more", actions });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = event.key.toLowerCase();
    const ctrl = event.ctrlKey || event.metaKey;

    if (ctrl && key === "l") {
      event.preventDefault();
      setFocusAddressNonce((value) => value + 1);
    } else if (ctrl && key === "d") {
      event.preventDefault();
      toggleCurrentFavorite();
    } else if (ctrl && key === "h") {
      event.preventDefault();
      visit(HISTORY_URL);
    } else if (event.key === "F5" || (ctrl && key === "r")) {
      event.preventDefault();
      reload();
    } else if (event.altKey && event.key === "ArrowLeft") {
      event.preventDefault();
      goBack();
    } else if (event.altKey && event.key === "ArrowRight") {
      event.preventDefault();
      goForward();
    } else if (event.altKey && event.key === "Home") {
      event.preventDefault();
      visit(NEW_TAB_URL);
    }
  };

  return (
    <div className={cn("w11-browser__panel", active && "is-active")} role="tabpanel" aria-hidden={!active} onKeyDown={handleKeyDown}>
      <BrowserToolbar
        address={address}
        security={security}
        loadState={loadState}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        isFavorite={isFavorite}
        canFavorite={Boolean(remoteUrl)}
        focusAddressNonce={focusAddressNonce}
        onAddressChange={setAddress}
        onSubmit={() => visit(address)}
        onRevert={() => setAddress(currentUrl)}
        onBack={goBack}
        onForward={goForward}
        onReload={reload}
        onHome={() => visit(NEW_TAB_URL)}
        onToggleFavorite={toggleCurrentFavorite}
        onMenu={openMenu}
      />

      {favorites.length > 0 ? (
        <div className="w11-browser__favorites" role="toolbar" aria-label="Favorites">
          {favorites.map((favorite) => (
            <button key={favorite.url} type="button" className="w11-browser__favorite" title={favorite.url} onClick={() => visit(favorite.url)}>
              <SiteBadge url={favorite.url} size={16} />
              <span>{favorite.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <section className="browser-app__viewport w11-browser__viewport">
        {isInternal ? (
          currentUrl === HISTORY_URL ? <HistoryPage onVisit={visit} /> : <NewTabPage onVisit={visit} />
        ) : (
          <BrowserViewport
            document={resolvedDocument}
            viewMode={viewMode}
            loadState={loadState}
            fallback={fallback}
            refreshToken={refreshToken}
            canOpenExternally={Boolean(remoteUrl)}
            onLocalNavigate={visit}
            onFrameLoad={handleFrameLoad}
            onFrameError={handleFrameError}
            onOpenInNewTab={openExternally}
            onRetryWithProxy={retryWithProxy}
          />
        )}
      </section>
    </div>
  );
}
