import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, RefreshCcw } from "lucide-react";
import { AppContent, AppFooter, AppScaffold } from "@/components/apps/app-layout";
import { MediaToolbar } from "@/components/apps/media-toolbar";
import { useWindowStore } from "@/stores/window-store";
import type { AppComponentProps } from "@/types/system";

interface EmbeddedGameAppProps extends AppComponentProps {
  title: string;
  subtitle: string;
  src: string;
  note: string;
  creditsLabel?: string;
  creditsHref?: string;
}

const LOAD_TIMEOUT_MS = 8000;
const FRAME_STYLE_ID = "os-embedded-game-style";
const FRAME_STYLE_TEXT = `
  html, body {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    overflow: hidden !important;
    background: #05080c !important;
  }

  body.offline.arcade-mode {
    display: grid !important;
    place-items: center !important;
  }

  body.offline.arcade-mode #messageBox {
    position: absolute !important;
    inset: 0 !important;
    display: grid !important;
    place-items: center !important;
    background: rgba(5, 8, 12, 0.82) !important;
    z-index: 9 !important;
  }

  body.offline.arcade-mode .interstitial-wrapper {
    width: 100% !important;
    height: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }

  body.offline.arcade-mode .runner-container,
  body.offline.arcade-mode .runner-canvas {
    max-width: 100% !important;
  }

  #canvas {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    display: block !important;
    background: #05080c !important;
  }

  #jsdos,
  .dosbox-container,
  .dosbox-container canvas,
  .emulator-canvas,
  .emulator-video {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
  }

  #openSideBar,
  #socialShare,
  #badges,
  .rrssb-buttons {
    display: none !important;
  }

  #pauseBtn,
  #restartBtn {
    width: 56px !important;
    height: 56px !important;
  }
`;

export function EmbeddedGameApp({
  window: appWindow,
  title,
  subtitle,
  src,
  note,
  creditsLabel,
  creditsHref,
}: EmbeddedGameAppProps) {
  const activeWindowId = useWindowStore((state) => state.activeWindowId);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const frameSrc = useMemo(() => `${src}${src.includes("?") ? "&" : "?"}session=${reloadToken}`, [src, reloadToken]);

  const focusFrame = () => {
    const frame = frameRef.current;

    if (!frame) {
      return;
    }

    frame.focus();

    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.document.body?.focus();
    } catch {
      // Same-origin game pages should focus, but avoid throwing if the frame is still booting.
    }
  };

  const syncEmbeddedLayout = () => {
    const frame = frameRef.current;
    const documentNode = frame?.contentDocument;

    if (!frame || !documentNode) {
      return;
    }

    if (!documentNode.getElementById(FRAME_STYLE_ID)) {
      const styleNode = documentNode.createElement("style");
      styleNode.id = FRAME_STYLE_ID;
      styleNode.textContent = FRAME_STYLE_TEXT;
      documentNode.head?.appendChild(styleNode);
    }

    documentNode.body?.classList.add("os-embedded-game");

    if (documentNode.body?.classList.contains("offline")) {
      documentNode.body.classList.add("arcade-mode");
    }

    try {
      frame.contentWindow?.dispatchEvent(new Event("resize"));
    } catch {
      // Local game bundles should stay same-origin, but keep the wrapper resilient if one changes later.
    }
  };

  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);
  }, [reloadToken, src]);

  useEffect(() => {
    if (loaded) {
      return;
    }

    const timeoutId = globalThis.window.setTimeout(() => {
      setTimedOut(true);
    }, LOAD_TIMEOUT_MS);

    return () => globalThis.window.clearTimeout(timeoutId);
  }, [loaded, reloadToken, src]);

  useEffect(() => {
    if (!loaded || activeWindowId !== appWindow.id) {
      return;
    }

    const frameFocusId = globalThis.window.setTimeout(() => {
      syncEmbeddedLayout();
      focusFrame();
    }, 60);

    return () => globalThis.window.clearTimeout(frameFocusId);
  }, [activeWindowId, appWindow.id, loaded]);

  return (
    <AppScaffold className="embedded-game">
      <MediaToolbar
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {creditsHref && creditsLabel ? (
              <a className="pill-button" href={creditsHref} target="_blank" rel="noreferrer">
                <ExternalLink size={15} />
                {creditsLabel}
              </a>
            ) : null}
            <button
              type="button"
              className="pill-button"
              onClick={() => {
                setLoaded(false);
                setTimedOut(false);
                setReloadToken((current) => current + 1);
              }}
            >
              <RefreshCcw size={15} />
              Reload
            </button>
          </>
        }
      />

      <AppContent className="embedded-game__content" padded={false} scrollable={false}>
        <div
          className={`embedded-game__viewport ${loaded ? "is-loaded" : ""}`}
          onPointerDown={focusFrame}
        >
          {!loaded ? (
            <div className="embedded-game__loading">
              <strong>Launching {title}</strong>
              <p>Booting the local game bundle inside the OS window.</p>
            </div>
          ) : null}

          {timedOut && !loaded ? (
            <div className="embedded-game__error">
              <strong>{title} is taking longer than expected</strong>
              <p>Use Reload to restart the local bundle if the game stays blank.</p>
            </div>
          ) : null}

          <iframe
            key={frameSrc}
            ref={frameRef}
            className="embedded-game__frame"
            src={frameSrc}
            title={title}
            loading="eager"
            tabIndex={0}
            allow="autoplay; fullscreen; gamepad"
            onLoad={() => {
              syncEmbeddedLayout();
              setLoaded(true);
              setTimedOut(false);
              focusFrame();
            }}
          />
        </div>
      </AppContent>

      <AppFooter className="embedded-game__footer">
        <span>{note}</span>
        <small>Tap or click once inside the game if you want to reclaim keyboard input manually.</small>
      </AppFooter>
    </AppScaffold>
  );
}
