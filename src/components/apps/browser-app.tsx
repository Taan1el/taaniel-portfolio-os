import { useMemo } from "react";
import { AppContent, AppFooter, AppScaffold } from "@/components/apps/app-layout";
import { BrowserSidebar } from "@/components/apps/browser/browser-sidebar";
import { BrowserToolbar } from "@/components/apps/browser/browser-toolbar";
import { BrowserViewport } from "@/components/apps/browser/browser-viewport";
import { useBrowserSession } from "@/components/apps/browser/use-browser-session";
import { browserBookmarks } from "@/lib/browser/bookmarks";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { AppComponentProps } from "@/types/system";

export function BrowserApp({ window }: AppComponentProps) {
  const readFile = useFileSystemStore((state) => state.readFile);
  const initialAddress = useMemo(
    () => window.payload?.externalUrl?.trim() || window.payload?.filePath?.trim() || "https://duckduckgo.com/",
    [window.payload?.externalUrl, window.payload?.filePath]
  );
  const {
    address,
    setAddress,
    currentUrl,
    proxyMode,
    setProxyMode,
    loading,
    error,
    resolvedDocument,
    refreshToken,
    canGoBack,
    canGoForward,
    visit,
    goBack,
    goForward,
    reload,
    handleFrameLoad,
    handleFrameError,
  } = useBrowserSession({
    initialAddress,
    readFile,
  });

  const canOpenExternally = resolvedDocument?.kind === "remote";

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
        proxyMode={proxyMode}
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
            loading={loading}
            error={error}
            refreshToken={refreshToken}
            canOpenExternally={Boolean(canOpenExternally)}
            onFrameLoad={handleFrameLoad}
            onFrameError={handleFrameError}
            onOpenInNewTab={openCurrentInNewTab}
            onOpenHome={() => visit("https://duckduckgo.com/")}
          />
        </section>
      </AppContent>

      <AppFooter className="browser-app__footer">
        <span>{error ?? resolvedDocument?.note ?? "Browser ready."}</span>
        <code>{resolvedDocument?.displayUrl ?? currentUrl ?? address ?? "No URL loaded"}</code>
      </AppFooter>
    </AppScaffold>
  );
}
