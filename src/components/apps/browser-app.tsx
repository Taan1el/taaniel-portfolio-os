import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, Globe2, RefreshCcw, ShieldAlert } from "lucide-react";
import { profile, socialLinks } from "@/data/portfolio";
import type { AppComponentProps } from "@/types/system";

const defaultLinks = [
  { label: "Portfolio Repo", url: "https://github.com/Taan1el/taaniel-portfolio-os" },
  { label: "Live Portfolio", url: "https://taaniel.github.io/taaniel-portfolio-os/" },
  ...socialLinks,
];

const SAFE_EMBED_HOSTS = new Set(["127.0.0.1", "localhost", "taaniel.github.io"]);

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

  if (/^(https?:\/\/|\/)/i.test(trimmed)) {
    return new URL(trimmed, window.location.href).toString();
  }

  return `https://${trimmed}`;
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

    if (parsedUrl.origin === currentOrigin || SAFE_EMBED_HOSTS.has(parsedUrl.hostname)) {
      return {
        mode: "embed",
        url: parsedUrl.toString(),
        note: "Same-origin and known-safe pages stay embedded inside the desktop shell.",
      };
    }

    return {
      mode: "fallback",
      url: parsedUrl.toString(),
      title: parsedUrl.hostname.replace(/^www\./i, ""),
      reason:
        "This site blocks iframe embedding, so the browser shows a safe launcher card instead of a broken page.",
    };
  } catch {
    return {
      mode: "fallback",
      url: rawUrl,
      title: "Invalid address",
      reason: "Enter a full URL or hostname to open the site.",
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
  const view = useMemo(() => resolveBrowserView(currentUrl), [currentUrl]);

  const visit = (nextUrl: string) => {
    const normalizedUrl = normalizeUrl(nextUrl);

    if (!normalizedUrl) {
      return;
    }

    setAddress(normalizedUrl);
    setHistory((previousHistory) => [...previousHistory.slice(0, historyIndex + 1), normalizedUrl]);
    setHistoryIndex((index) => index + 1);
  };

  return (
    <div className="browser-app">
      <header className="app-toolbar">
        <div className="app-toolbar__group">
          <button
            type="button"
            className="icon-button"
            disabled={historyIndex <= 0}
            onClick={() => setHistoryIndex((index) => Math.max(0, index - 1))}
          >
            <ArrowLeft size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            disabled={historyIndex >= history.length - 1}
            onClick={() => setHistoryIndex((index) => Math.min(history.length - 1, index + 1))}
          >
            <ArrowRight size={15} />
          </button>
          <button type="button" className="icon-button" onClick={() => setRefreshToken((token) => token + 1)}>
            <RefreshCcw size={15} />
          </button>
        </div>

        <form
          className="browser-app__address"
          onSubmit={(event) => {
            event.preventDefault();
            visit(address);
          }}
        >
          <Globe2 size={15} />
          <input value={address} onChange={(event) => setAddress(event.target.value)} />
        </form>

        <a className="pill-button" href={currentUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={15} />
          Open in new tab
        </a>
      </header>

      <div className="browser-app__content">
        <aside className="browser-app__sidebar">
          <p className="eyebrow">Bookmarks</p>
          {defaultLinks.map((link) => (
            <button key={link.label} type="button" className="quick-link" onClick={() => visit(link.url)}>
              <Globe2 size={15} />
              {link.label}
            </button>
          ))}
          <div className="browser-app__note">
            <strong>How this browser works</strong>
            <p>Embeddable pages stay in-window. Blocked HTTPS pages open honestly as launch cards.</p>
            <p>{profile.name} uses this as a clean OS browser, not a proxy-based full internet clone.</p>
          </div>
        </aside>

        <section className="browser-app__viewport">
          {view.mode === "embed" ? (
            <>
              <div className="browser-app__hint">{view.note}</div>
              <iframe
                key={`${view.url}:${refreshToken}`}
                src={view.url}
                title={view.url}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </>
          ) : (
            <div className="browser-app__fallback">
              <span className="browser-app__fallback-icon">
                <ShieldAlert size={22} />
              </span>
              <div className="browser-app__fallback-copy">
                <p className="eyebrow">Browser fallback</p>
                <h2>{view.title}</h2>
                <p>{view.reason}</p>
                <code>{view.url}</code>
              </div>
              <a className="pill-button" href={view.url} target="_blank" rel="noreferrer">
                <ExternalLink size={15} />
                Open site
              </a>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
