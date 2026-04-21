import { useCallback, useRef } from "react";
import { BrowserFallbackPanel } from "@/components/apps/browser/browser-fallback-panel";
import type {
  BrowserFallbackState,
  BrowserLoadState,
  BrowserResolvedDocument,
  ViewMode,
} from "@/lib/browser/types";

declare module "react" {
  interface IframeHTMLAttributes<T> extends React.HTMLAttributes<T> {
    credentialless?: "credentialless";
  }
}

interface BrowserViewportProps {
  document: BrowserResolvedDocument | null;
  viewMode: ViewMode;
  loadState: BrowserLoadState;
  fallback: BrowserFallbackState | null;
  refreshToken: number;
  canOpenExternally: boolean;
  onLocalNavigate: (path: string) => void;
  onFrameLoad: () => void;
  onFrameError: () => void;
  onOpenInNewTab: () => void;
  onRetryWithProxy: () => void;
}

export function BrowserViewport({
  document,
  viewMode,
  loadState,
  fallback,
  refreshToken,
  canOpenExternally,
  onLocalNavigate,
  onFrameLoad,
  onFrameError,
  onOpenInNewTab,
  onRetryWithProxy,
}: BrowserViewportProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const supportsCredentialless =
    typeof HTMLIFrameElement !== "undefined" &&
    "credentialless" in HTMLIFrameElement.prototype;

  const handleFrameLoad = useCallback(() => {
    if (document?.kind === "local" && document.localKind === "directory") {
      try {
        const frameDocument = iframeRef.current?.contentDocument;

        if (frameDocument && frameDocument.body.dataset.browserLocalBound !== "true") {
          frameDocument.addEventListener("click", (event) => {
            const target = event.target;

            if (!(target instanceof Element)) {
              return;
            }

            const activator = target.closest("[data-browser-path]");

            if (!(activator instanceof HTMLElement)) {
              return;
            }

            const targetPath = activator.getAttribute("data-browser-path");

            if (!targetPath) {
              return;
            }

            event.preventDefault();
            onLocalNavigate(targetPath);
          });

          frameDocument.body.dataset.browserLocalBound = "true";
        }
      } catch {
        // Ignore failure to bind local directory navigation inside iframe content.
      }
    }

    onFrameLoad();
  }, [document, onFrameLoad, onLocalNavigate]);

  if (viewMode === "fallback") {
    const fallbackState = fallback ?? {
      title: document?.title ?? "Unable to open page",
      url: document?.displayUrl ?? "No URL available",
      message: "This site cannot be embedded due to browser restrictions",
    };

    return (
      <BrowserFallbackPanel
        fallback={fallbackState}
        canOpenExternally={canOpenExternally}
        onOpenInNewTab={onOpenInNewTab}
        onRetryWithProxy={onRetryWithProxy}
      />
    );
  }

  if (!document) {
    return (
      <BrowserFallbackPanel
        fallback={{
          title: "Unable to open page",
          url: "No URL available",
          message: "This site cannot be embedded due to browser restrictions",
        }}
        canOpenExternally={canOpenExternally}
        onOpenInNewTab={onOpenInNewTab}
        onRetryWithProxy={onRetryWithProxy}
      />
    );
  }

  return (
    <div className="browser-app__frame-shell" data-state={loadState}>
      {loadState === "loading" ? (
        <div className="browser-app__loading-bar" aria-hidden="true">
          <span />
        </div>
      ) : null}

      <iframe
        ref={iframeRef}
        key={`${document.displayUrl}:${document.frameSource.kind}:${document.frameSource.value}:${refreshToken}`}
        src={document.frameSource.kind === "src" ? document.frameSource.value : undefined}
        srcDoc={document.frameSource.kind === "srcDoc" ? document.frameSource.value : undefined}
        title={document.title}
        sandbox="allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts"
        referrerPolicy="no-referrer"
        credentialless={supportsCredentialless ? "credentialless" : undefined}
        onLoad={handleFrameLoad}
        onError={onFrameError}
      />
    </div>
  );
}
