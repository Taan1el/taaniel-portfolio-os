import { useMemo, useState } from "react";
import { Search, Trash2, X } from "lucide-react";
import { displayHost, SiteBadge } from "@/components/apps/browser/site-badge";
import { useBrowserStore } from "@/stores/browser-store";

interface PageProps {
  onVisit: (address: string) => void;
}

export function NewTabPage({ onVisit }: PageProps) {
  const favorites = useBrowserStore((state) => state.favorites);
  const history = useBrowserStore((state) => state.history);
  const [query, setQuery] = useState("");

  const recent = useMemo(() => {
    const seen = new Set<string>();
    return history.filter((entry) => (seen.has(entry.url) ? false : (seen.add(entry.url), true))).slice(0, 5);
  }, [history]);

  return (
    <div className="w11-newtab">
      <form
        className="w11-newtab__search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (query.trim()) onVisit(query);
        }}
      >
        <Search size={18} aria-hidden="true" />
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the web or type a URL"
          aria-label="Search the web or type a URL"
        />
      </form>

      {favorites.length > 0 ? (
        <section className="w11-newtab__links" aria-label="Quick links">
          {favorites.slice(0, 8).map((favorite) => (
            <button
              key={favorite.url}
              type="button"
              className="w11-newtab__link"
              title={favorite.url}
              onClick={() => onVisit(favorite.url)}
            >
              <SiteBadge url={favorite.url} size={40} />
              <span>{favorite.label}</span>
            </button>
          ))}
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section className="w11-newtab__recent" aria-labelledby="w11-newtab-recent">
          <h2 id="w11-newtab-recent">Recently visited</h2>
          {recent.map((entry) => (
            <button key={entry.visitedAt} type="button" className="w11-newtab__recent-row" onClick={() => onVisit(entry.url)}>
              <SiteBadge url={entry.url} size={20} />
              <span>{entry.title}</span>
              <small>{displayHost(entry.url)}</small>
            </button>
          ))}
        </section>
      ) : null}

      <p className="w11-newtab__note">
        Sites open inside this window when they allow it. If one refuses, use the … menu to open it in your own browser.
      </p>
    </div>
  );
}

function dayLabel(timestamp: number) {
  const day = new Date(timestamp);
  const today = new Date();
  const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(day)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return day.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
}

export function HistoryPage({ onVisit }: PageProps) {
  const history = useBrowserStore((state) => state.history);
  const removeHistoryEntry = useBrowserStore((state) => state.removeHistoryEntry);
  const clearHistory = useBrowserStore((state) => state.clearHistory);
  const [filter, setFilter] = useState("");

  const groups = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const matches = needle
      ? history.filter((entry) => `${entry.title} ${entry.url}`.toLowerCase().includes(needle))
      : history;
    const byDay = new Map<string, typeof history>();
    matches.forEach((entry) => {
      const label = dayLabel(entry.visitedAt);
      byDay.set(label, [...(byDay.get(label) ?? []), entry]);
    });
    return Array.from(byDay.entries());
  }, [filter, history]);

  return (
    <div className="w11-history">
      <header className="w11-history__header">
        <h1>History</h1>
        <label className="w11-history__search">
          <Search size={14} aria-hidden="true" />
          <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search history" aria-label="Search history" />
        </label>
        <button
          type="button"
          className="w11-button"
          disabled={history.length === 0}
          onClick={() => {
            if (globalThis.confirm("Clear your browsing history in this browser?")) clearHistory();
          }}
        >
          <Trash2 size={14} aria-hidden="true" />
          Clear browsing data
        </button>
      </header>

      {groups.length === 0 ? (
        <p className="w11-history__empty">{history.length === 0 ? "Pages you visit will show up here." : "No history matches your search."}</p>
      ) : (
        groups.map(([label, entries]) => (
          <section key={label} className="w11-history__group" aria-label={label}>
            <h2>{label}</h2>
            {entries.map((entry) => (
              <div key={entry.visitedAt} className="w11-history__row">
                <button type="button" className="w11-history__open" onClick={() => onVisit(entry.url)} title={entry.url}>
                  <SiteBadge url={entry.url} size={16} />
                  <span className="w11-history__title">{entry.title}</span>
                  <span className="w11-history__host">{displayHost(entry.url)}</span>
                </button>
                <time dateTime={new Date(entry.visitedAt).toISOString()}>
                  {new Date(entry.visitedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </time>
                <button
                  type="button"
                  className="w11-history__remove"
                  aria-label={`Remove ${entry.title} from history`}
                  onClick={() => removeHistoryEntry(entry.visitedAt)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
