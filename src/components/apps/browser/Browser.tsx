import { useMemo } from "react";
import { AppContent, AppFooter, AppScaffold } from "@/components/apps/app-layout";
import { BrowserSidebar } from "@/components/apps/browser/browser-sidebar";
import { BrowserToolbar } from "@/components/apps/browser/browser-toolbar";
import { BrowserViewport } from "@/components/apps/browser/browser-viewport";
import { useBrowserState } from "@/components/apps/browser/useBrowserState";
import { browserBookmarks } from "@/lib/browser/bookmarks";
import {
  getProxyIndicatorLabel,
  proxyModeNotes,
} from "@/lib/browser/proxy";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { AppComponentProps } from "@/types/system";

export function Browser({ window }: AppComponentProps) {
  const readFile = useFileSystemStore((state) => state.readFile);
  const initialAddress = useMemo(
    () =>
      window.payload?.externalUrl?.trim() ||
      window.payload?.filePath?.trim() ||
      "https://duckduckgo.com/",
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
    readFile,
  });

  const canOpenExternally = resolvedDocument?.kind === "remote";
  const displayedUrl = resolvedDocument?.displayUrl ?? currentUrl ?? address ?? "No URL loaded";
  const browserStatusMessage = fallback?.message ?? resolvedDocument?.note ?? "Browser ready.";
  const securityIndicatorLabel = getProxyIndicatorLabel(proxyMode);
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
        securityIndicatorLabel={securityIndicatorLabel}
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
            onFrameLoad={handleFrameLoad}
            onFrameError={handleFrameError}
            onOpenInNewTab={openCurrentInNewTab}
            onRetryWithProxy={retryWithProxy}
          />
        </section>
      </AppContent>

      <AppFooter className="browser-app__footer">
        <span>{browserStatusMessage}</span>
        <code title={displayedUrl}>{displayedUrl}</code>
      </AppFooter>
    </AppScaffold>
  );
}
