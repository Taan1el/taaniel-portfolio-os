import { useMemo } from "react";
import { AppContent, AppScaffold } from "@/components/apps/app-layout";
import { BrowserSidebar } from "@/components/apps/browser/browser-sidebar";
import { BrowserToolbar } from "@/components/apps/browser/browser-toolbar";
import { BrowserViewport } from "@/components/apps/browser/browser-viewport";
import { useBrowserState } from "@/components/apps/browser/useBrowserState";
import { browserBookmarks } from "@/lib/browser/bookmarks";
import { proxyModeNotes } from "@/lib/browser/proxy";
import { DEFAULT_BROWSER_HOME } from "@/lib/browser/urlUtils";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { AppComponentProps } from "@/types/system";

export function Browser({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const initialAddress = useMemo(
    () =>
      window.payload?.externalUrl?.trim() ||
      window.payload?.filePath?.trim() ||
      DEFAULT_BROWSER_HOME,
    [window.payload?.externalUrl, window.payload?.filePath]
  );
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
  } = useBrowserState({
    initialAddress,
    nodes,
  });

  const canOpenExternally = resolvedDocument?.kind === "remote";
  const displayedUrl = resolvedDocument?.displayUrl ?? currentUrl ?? address ?? "No URL loaded";
  const securityIndicatorTitle = proxyModeNotes[proxyMode];

  const openCurrentInNewTab = () => {
    if (!resolvedDocument || resolvedDocument.kind !== "remote") {
      return;
    }

    globalThis.window.open(resolvedDocument.displayUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <AppScaffold className="browser-app">
      <BrowserToolbar
        address={address}
        displayedUrl={displayedUrl}
        proxyMode={proxyMode}
        loadState={loadState}
        securityIndicatorTitle={securityIndicatorTitle}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        canOpenExternally={Boolean(canOpenExternally)}
        onAddressChange={setAddress}
        onBack={goBack}
        onForward={goForward}
        onReload={reload}
        onSubmit={() => visit(address)}
        onProxyModeChange={setProxyMode}
        onOpenInNewTab={openCurrentInNewTab}
      />

      <AppContent className="browser-app__content" padded={false} scrollable={false} stacked={false}>
        <BrowserSidebar
          bookmarks={browserBookmarks}
          activeUrl={resolvedDocument?.displayUrl ?? currentUrl}
          onVisit={visit}
        />

        <section className="browser-app__viewport">
          <BrowserViewport
            document={resolvedDocument}
            viewMode={viewMode}
            loadState={loadState}
            fallback={fallback}
            refreshToken={refreshToken}
            canOpenExternally={Boolean(canOpenExternally)}
            onLocalNavigate={visit}
            onFrameLoad={handleFrameLoad}
            onFrameError={handleFrameError}
            onOpenInNewTab={openCurrentInNewTab}
            onRetryWithProxy={retryWithProxy}
          />
        </section>
      </AppContent>
    </AppScaffold>
  );
}
