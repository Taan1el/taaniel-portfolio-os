import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe2,
  Network,
  RefreshCcw,
  ShieldAlert,
  Star,
} from "lucide-react";
import {
  AppContent,
  AppFooter,
  AppScaffold,
  AppSidebar,
  AppToolbar,
  Button,
  IconButton,
  SearchInput,
} from "@/components/apps/app-layout";
import { socialLinks } from "@/data/portfolio";
import { cn } from "@/lib/utils";
import type { AppComponentProps } from "@/types/system";

const bookmarks = [
  { label: "GitHub profile", url: "https://github.com/Taan1el" },
  { label: "Portfolio repo", url: "https://github.com/Taan1el/taaniel-portfolio-os" },
  { label: "Live portfolio", url: "https://taaniel.github.io/taaniel-portfolio-os/" },
  ...socialLinks,
];

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const EMBED_TIMEOUT_MS = 6500;
const ALL_ORIGINS_PROXY = "https://api.allorigins.win/raw?url=";

function buildProxyIframeSrc(httpsUrl: string) {
  return `${ALL_ORIGINS_PROXY}${encodeURIComponent(httpsUrl)}`;
}

type BrowserView =
  | {
      mode: "embed";
      url: string;
      title: string;
      note: string;
    }
  | {
      mode: "fallback";
      url: string;
      title: string;
      reason: string;
    };

function normalizeUrl(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return "";
  }

  const looksLikeHostWithPort = /^[a-z0-9.-]+:\d/i.test(trimmed);
  const rawScheme = trimmed.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();

  if (rawScheme && !looksLikeHostWithPort && !ALLOWED_PROTOCOLS.has(`${rawScheme}:`)) {
    return "";
  }

  try {
    const resolvedUrl = /^(?:[a-z]+:)?\/\//i.test(trimmed) || trimmed.startsWith("/")
      ? new URL(trimmed, window.location.href)
      : new URL(`https://${trimmed}`);

    if (!ALLOWED_PROTOCOLS.has(resolvedUrl.protocol)) {
      return "";
    }

    return resolvedUrl.toString();
  } catch {
    return "";
  }
}

function resolveYouTubeEmbed(url: URL) {
  const hostname = url.hostname.replace(/^www\./i, "");

  if (hostname === "youtu.be") {
    const videoId = url.pathname.split("/").filter(Boolean)[0];
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
  }

  if (hostname === "youtube.com" || hostname === "m.youtube.com") {
    if (url.pathname === "/watch") {
      const videoId = url.searchParams.get("v");
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    }

    if (url.pathname.startsWith("/embed/")) {
      return url.toString();
    }
  }

  return null;
}

function resolveBrowserView(rawUrl: string): BrowserView {
  if (!rawUrl) {
    return {
      mode: "fallback",
      url: "",
      title: "Invalid address",
      reason: "Enter a valid http or https URL to open a site safely.",
    };
  }

  try {
    const parsedUrl = new URL(rawUrl);

    if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
      return {
        mode: "fallback",
        url: rawUrl,
        title: "Blocked address",
        reason: "Only http and https addresses are allowed in the browser app.",
      };
    }

    const currentOrigin = window.location.origin;
    const embedUrl = resolveYouTubeEmbed(parsedUrl);

    if (embedUrl) {
      return {
        mode: "embed",
        url: embedUrl,
        title: "YouTube",
        note: "YouTube links open in privacy-enhanced embed mode inside the desktop.",
      };
    }

    const isLocalDevHost = parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost";

    if (parsedUrl.origin === currentOrigin || isLocalDevHost) {
      return {
        mode: "embed",
        url: parsedUrl.toString(),
        title: parsedUrl.hostname.replace(/^www\./i, ""),
        note: "Only same-origin or local development pages stay embedded inside the desktop shell.",
      };
    }

    return {
      mode: "fallback",
      url: parsedUrl.toString(),
      title: parsedUrl.hostname.replace(/^www\./i, ""),
      reason:
        "Most external sites block iframe embedding for security. Use Open in new tab for the full site—this preview cannot become a full Chrome window without a dedicated server proxy.",
    };
  } catch {
    return {
      mode: "fallback",
      url: rawUrl,
      title: "Invalid address",
      reason: "Enter a valid full URL or hostname to open the site in a new tab.",
    };
  }
}

export function BrowserApp({ window }: AppComponentProps) {
  const initialUrl = useMemo(
    () => normalizeUrl(window.payload?.externalUrl ?? "https://github.com/Taan1el"),
    [window.payload?.externalUrl]
  );
  const [address, setAddress] = useState(initialUrl);
  const [history, setHistory] = useState<string[]>([initialUrl]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [embedState, setEmbedState] = useState<"idle" | "loading" | "ready" | "blocked">("idle");
  const [proxyPreview, setProxyPreview] = useState(false);

  useEffect(() => {
    setAddress(initialUrl);
    setHistory([initialUrl]);
    setHistoryIndex(0);
    setRefreshToken(0);
    setEmbedState("idle");
  }, [initialUrl]);

  const currentUrl = history[historyIndex] ?? initialUrl;

  useEffect(() => {
    setAddress(currentUrl);
  }, [currentUrl]);

  const view = useMemo(() => resolveBrowserView(currentUrl), [currentUrl]);
  const effectiveView = useMemo(() => {
    if (!proxyPreview) {
      return view;
    }

    const normalized = normalizeUrl(currentUrl);
    if (!normalized) {
      return view;
    }

    return {
      mode: "embed" as const,
      url: buildProxyIframeSrc(normalized),
      title: view.title,
      note: "Public CORS proxy preview (allorigins). Third-party content — do not sign in or enter secrets; layout may be wrong.",
    };
  }, [currentUrl, proxyPreview, view]);

  const normalizedCurrent = normalizeUrl(currentUrl);
  const canOpenExternally = Boolean(normalizedCurrent && /^https?:\/\//i.test(normalizedCurrent));
  const showEmbedFallback = effectiveView.mode === "embed" && embedState === "blocked";
  const fallbackReason =
    effectiveView.mode === "fallback"
      ? effectiveView.reason
      : "This site cannot be embedded. Open in new tab.";
  const footerMessage =
    effectiveView.mode === "embed" && !showEmbedFallback ? effectiveView.note : fallbackReason;

  useEffect(() => {
    if (effectiveView.mode !== "embed") {
      setEmbedState("idle");
      return;
    }

    setEmbedState("loading");
    const timeoutId = globalThis.window.setTimeout(() => {
      setEmbedState((currentState) => (currentState === "ready" ? currentState : "blocked"));
    }, EMBED_TIMEOUT_MS);

    return () => globalThis.window.clearTimeout(timeoutId);
  }, [refreshToken, effectiveView]);

  const visit = (nextUrl: string) => {
    const normalizedUrl = normalizeUrl(nextUrl);

    if (!normalizedUrl) {
      setAddress(nextUrl.trim());
      setHistory((previousHistory) => {
        const nextHistory = previousHistory.slice(0, historyIndex + 1);
        const candidate = nextUrl.trim();

        if (!candidate || nextHistory.at(-1) === candidate) {
          return nextHistory;
        }

        return [...nextHistory, candidate];
      });
      setHistoryIndex((index) => {
        const nextHistory = history.slice(0, index + 1);
        const candidate = nextUrl.trim();
        return !candidate || nextHistory.at(-1) === candidate ? index : index + 1;
      });
      setRefreshToken(0);
      setEmbedState("idle");
      return;
    }

    setRefreshToken(0);
    setEmbedState("idle");
    setAddress(normalizedUrl);
    setHistory((previousHistory) => {
      const nextHistory = previousHistory.slice(0, historyIndex + 1);
      const lastUrl = nextHistory.at(-1);

      if (lastUrl === normalizedUrl) {
        return nextHistory;
      }

      return [...nextHistory, normalizedUrl];
    });
    setHistoryIndex((index) => {
      const currentHistoryUrl = history[index];
      return currentHistoryUrl === normalizedUrl ? index : index + 1;
    });
  };

  const openCurrentInNewTab = () => {
    if (!normalizedCurrent) {
      return;
    }

    globalThis.window.open(normalizedCurrent, "_blank", "noopener,noreferrer");
  };

  return (
    <AppScaffold className="browser-app">
      <AppToolbar className="browser-app__toolbar">
        <div className="app-toolbar__group">
          <IconButton
            type="button"
            disabled={historyIndex <= 0}
            onClick={() => setHistoryIndex((index) => Math.max(0, index - 1))}
            aria-label="Back"
          >
            <ArrowLeft size={15} />
          </IconButton>
          <IconButton
            type="button"
            disabled={historyIndex >= history.length - 1}
            onClick={() => setHistoryIndex((index) => Math.min(history.length - 1, index + 1))}
            aria-label="Forward"
          >
            <ArrowRight size={15} />
          </IconButton>
          <IconButton
            type="button"
            onClick={() => setRefreshToken((token) => token + 1)}
            aria-label="Reload"
          >
            <RefreshCcw size={15} />
          </IconButton>
        </div>

        <form
          className="browser-app__address-form"
          onSubmit={(event) => {
            event.preventDefault();
            visit(address);
          }}
        >
          <SearchInput
            containerClassName="browser-app__address"
            placeholder="Enter a URL or hostname"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            icon={<Globe2 size={14} />}
          />
        </form>

        <Button
          type="button"
          variant={proxyPreview ? "panel" : "ghost"}
          onClick={() => setProxyPreview((previous) => !previous)}
          disabled={!normalizeUrl(currentUrl)}
          title="Load many external sites through a public proxy (like daedalOS). Not for sensitive pages."
        >
          <Network size={15} />
          Proxy preview
        </Button>

        <Button
          type="button"
          variant="panel"
          onClick={openCurrentInNewTab}
          disabled={!canOpenExternally}
        >
          <ExternalLink size={15} />
          Open in new tab
        </Button>
      </AppToolbar>

      <AppContent className="browser-app__content" padded={false} scrollable={false} stacked={false}>
        <AppSidebar className="browser-app__sidebar">
          <div className="browser-app__sidebar-group">
            <p className="eyebrow">Bookmarks</p>
            <div className="browser-app__bookmark-list">
              {bookmarks.map((bookmark) => {
                const normalizedBookmark = normalizeUrl(bookmark.url);
                const isActive = currentUrl === normalizedBookmark;

                return (
                  <button
                    key={bookmark.label}
                    type="button"
                    className={cn("browser-app__bookmark", isActive && "is-active")}
                    onClick={() => visit(bookmark.url)}
                  >
                    <Star size={14} />
                    <span>{bookmark.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="browser-app__note">
            <strong>How this browser works</strong>
            <p>
              Same-origin, localhost, and supported video embeds load here. Other HTTPS sites usually forbid iframes—open
              them in a new tab for the full experience.
            </p>
          </div>
        </AppSidebar>

        <section className="browser-app__viewport">
          {effectiveView.mode === "embed" && !showEmbedFallback ? (
            <div className="browser-app__frame-shell" data-state={embedState}>
              {embedState === "loading" ? (
                <div className="browser-app__hint">
                  <strong>Loading embedded page</strong>
                  <p>If the page cannot finish loading inside the sandbox, the browser falls back to a new-tab launcher.</p>
                </div>
              ) : null}
              <iframe
                key={`${effectiveView.url}:${refreshToken}`}
                src={effectiveView.url}
                title={effectiveView.url}
                // The browser iframe stays sandboxed so loaded pages cannot escape or navigate the shell.
                sandbox="allow-scripts allow-same-origin"
                referrerPolicy="no-referrer"
                allowFullScreen
                onLoad={() => setEmbedState("ready")}
                onError={() => setEmbedState("blocked")}
              />
            </div>
          ) : (
            <div className="browser-app__fallback">
              <span className="browser-app__fallback-icon">
                <ShieldAlert size={22} />
              </span>
              <div className="browser-app__fallback-copy">
                <p className="eyebrow">{showEmbedFallback ? "Embedding blocked" : "External site"}</p>
                <h2>{effectiveView.title}</h2>
                <p>{fallbackReason}</p>
                <code>{effectiveView.url}</code>
              </div>
              <div className="browser-app__fallback-actions">
                <Button
                  type="button"
                  variant="panel"
                  onClick={openCurrentInNewTab}
                  disabled={!canOpenExternally}
                >
                  <ExternalLink size={15} />
                  Open in new tab
                </Button>
                <Button type="button" variant="ghost" onClick={() => visit(bookmarks[0]?.url ?? initialUrl)}>
                  <Globe2 size={15} />
                  Open bookmark
                </Button>
              </div>
            </div>
          )}
        </section>
      </AppContent>

      <AppFooter className="browser-app__footer">
        <span>{footerMessage}</span>
        <code>{currentUrl || address || "No URL loaded"}</code>
      </AppFooter>
    </AppScaffold>
  );
}
