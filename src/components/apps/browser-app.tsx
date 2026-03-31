import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, Globe2, RefreshCcw } from "lucide-react";
import { profile, socialLinks } from "@/data/portfolio";
import type { AppComponentProps } from "@/types/system";

const defaultLinks = [
  { label: "Portfolio Repo", url: "https://github.com/Taan1el/taaniel-portfolio-os" },
  { label: "Live Portfolio", url: "https://taan1el.github.io/taaniel-portfolio-os/" },
  ...socialLinks,
];

function normalizeUrl(input: string) {
  if (!input.trim()) {
    return "";
  }

  if (/^https?:\/\//i.test(input)) {
    return input;
  }

  return `https://${input}`;
}

export function BrowserApp({ window }: AppComponentProps) {
  const initialUrl = useMemo(
    () => normalizeUrl(window.payload?.externalUrl ?? "https://github.com/Taan1el"),
    [window.payload?.externalUrl]
  );
  const [address, setAddress] = useState(initialUrl);
  const [history, setHistory] = useState<string[]>([initialUrl]);
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    setAddress(initialUrl);
    setHistory([initialUrl]);
    setHistoryIndex(0);
  }, [initialUrl]);

  const currentUrl = history[historyIndex] ?? initialUrl;

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
          <button type="button" className="icon-button" onClick={() => setAddress(currentUrl)}>
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
            <strong>Embedding note</strong>
            <p>
              Some external sites block iframe embedding. When that happens, use the new-tab button and
              treat this app as a bookmark launcher inside the desktop.
            </p>
            <p>{profile.name} uses this as an external link workspace, not a full browser replacement.</p>
          </div>
        </aside>

        <section className="browser-app__viewport">
          <iframe key={currentUrl} src={currentUrl} title={currentUrl} />
        </section>
      </div>
    </div>
  );
}
