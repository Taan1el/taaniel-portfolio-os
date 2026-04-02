import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe2,
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
import { profile, socialLinks } from "@/data/portfolio";
import { cn } from "@/lib/utils";
import type { AppComponentProps } from "@/types/system";

const bookmarks = [
  { label: "GitHub profile", url: "https://github.com/Taan1el" },
  { label: "Portfolio repo", url: "https://github.com/Taan1el/taaniel-portfolio-os" },
  { label: "Live portfolio", url: "https://taaniel.github.io/taaniel-portfolio-os/" },
  ...socialLinks,
];

type BrowserView =
  | {
      mode: "embed";
      url: string;
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

  try {
    if (/^(https?:\/\/|\/)/i.test(trimmed)) {
      return new URL(trimmed, window.location.href).toString();
    }

    return new URL(`https://${trimmed}`).toString();
  } catch {
    return trimmed;
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
  try {
    const parsedUrl = new URL(rawUrl);
    const currentOrigin = window.location.origin;
    const embedUrl = resolveYouTubeEmbed(parsedUrl);

    if (embedUrl) {
      return {
        mode: "embed",
        url: embedUrl,
        note: "YouTube links open in privacy-enhanced embed mode inside the desktop.",
      };
    }

    const isLocalDevHost = parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost";

    if (parsedUrl.origin === currentOrigin || isLocalDevHost) {
      return {
        mode: "embed",
        url: parsedUrl.toString(),
        note: "Only same-origin or local development pages stay embedded inside the desktop shell.",
      };
    }

    return {
      mode: "fallback",
      url: parsedUrl.toString(),
      title: parsedUrl.hostname.replace(/^www\./i, ""),
      reason:
        "This site blocks iframe embedding, so the browser shows a launcher state instead of pretending the page loaded.",
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

  useEffect(() => {
    setAddress(initialUrl);
    setHistory([initialUrl]);
    setHistoryIndex(0);
    setRefreshToken(0);
  }, [initialUrl]);

  const currentUrl = history[historyIndex] ?? initialUrl;

  useEffect(() => {
    setAddress(currentUrl);
  }, [currentUrl]);

  const view = useMemo(() => resolveBrowserView(currentUrl), [currentUrl]);
  const canOpenExternally = /^https?:\/\//i.test(view.url);
  const footerMessage = view.mode === "embed" ? view.note : view.reason;

  const visit = (nextUrl: string) => {
    const normalizedUrl = normalizeUrl(nextUrl);

    if (!normalizedUrl) {
      return;
    }

    setRefreshToken(0);
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
    if (!canOpenExternally) {
      return;
    }

    globalThis.window.open(view.url, "_blank", "noopener,noreferrer");
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
            <strong>Embedded browser rules</strong>
            <p>Only same-origin pages, local dev pages, and supported video embeds stay inside the desktop shell.</p>
            <p>{profile.name} keeps blocked sites honest by routing them to a safe launcher state.</p>
          </div>
        </AppSidebar>

        <section className="browser-app__viewport">
          {view.mode === "embed" ? (
            <div className="browser-app__frame-shell">
              <iframe
                key={`${view.url}:${refreshToken}`}
                src={view.url}
                title={view.url}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="browser-app__fallback">
              <span className="browser-app__fallback-icon">
                <ShieldAlert size={22} />
              </span>
              <div className="browser-app__fallback-copy">
                <p className="eyebrow">External site</p>
                <h2>{view.title}</h2>
                <p>{view.reason}</p>
                <code>{view.url}</code>
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
        <code>{currentUrl}</code>
      </AppFooter>
    </AppScaffold>
  );
}
