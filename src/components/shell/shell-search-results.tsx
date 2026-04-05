import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { ExternalLink, FileText, Folder } from "lucide-react";
import { ScrollArea, StatusBar } from "@/components/apps/app-layout";
import type { ShellAiSearchStatus } from "@/hooks/use-shell-ai-search";
import {
  flattenShellSearchResults,
  getTopSearchResult,
  type ShellSearchAction,
  type ShellSearchResult,
  type ShellSearchSection,
} from "@/lib/shell-search";
import { cn } from "@/lib/utils";

function SearchResultIcon({ result }: { result: ShellSearchResult }) {
  if (result.icon) {
    const Icon = result.icon;

    return (
      <span className="search-result__icon" style={{ "--app-accent": result.accent } as CSSProperties}>
        <Icon size={16} />
      </span>
    );
  }

  return (
    <span className="search-result__icon">
      {result.type === "folder" ? (
        <Folder size={16} />
      ) : result.type === "link" ? (
        <ExternalLink size={16} />
      ) : (
        <FileText size={16} />
      )}
    </span>
  );
}

function matchModeLabel(result: ShellSearchResult) {
  switch (result.matchMode) {
    case "exact":
      return "Exact";
    case "semantic":
      return "Smart";
    default:
      return "Match";
  }
}

export function getShellSearchHint(aiStatus: ShellAiSearchStatus, aiEnabled: boolean) {
  if (!aiEnabled) {
    return "Local search is ready. Type at least 3 characters to enable AI-assisted reranking.";
  }

  switch (aiStatus) {
    case "warming":
      return "Local results are live while the AI reranker warms up in the background.";
    case "ranking":
      return "Local results are live and the AI reranker is refining intent and ranking.";
    case "ready":
      return "AI-assisted reranking is active for this search. Everything stays inside the launcher.";
    case "fallback":
      return "AI reranking is unavailable right now, so search is using the fast local fallback.";
    default:
      return "Local search is ready. Type at least 3 characters to enable AI-assisted reranking.";
  }
}

export function getShellSearchStatusLabel(aiStatus: ShellAiSearchStatus, aiEnabled: boolean) {
  if (!aiEnabled) {
    return "Local index";
  }

  switch (aiStatus) {
    case "warming":
      return "AI warming";
    case "ranking":
      return "AI ranking";
    case "ready":
      return "AI ready";
    case "fallback":
      return "Fallback";
    default:
      return "Local index";
  }
}

interface SearchResultButtonProps {
  result: ShellSearchResult;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}

function SearchResultButton({ result, active, onHover, onSelect }: SearchResultButtonProps) {
  const showSubtitle = result.type !== "link";

  return (
    <button
      type="button"
      className={cn("search-result", active && "is-active")}
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onSelect}
    >
      <SearchResultIcon result={result} />
      <span className="search-result__meta">
        <strong title={showSubtitle ? result.title : `${result.title} — ${result.subtitle}`}>
          {result.title}
        </strong>
        {showSubtitle ? <small title={result.subtitle}>{result.subtitle}</small> : null}
        {result.preview ? (
          <span className="search-result__preview" title={result.preview}>
            {result.preview}
          </span>
        ) : null}
        <span className="search-result__badges">
          <span>{result.actionLabel}</span>
          <span>{matchModeLabel(result)}</span>
        </span>
      </span>
    </button>
  );
}

export type ShellSearchResultsHandle = {
  /** Returns true when the key was consumed (caller should preventDefault). */
  handleSearchKeyDown: (event: KeyboardEvent<HTMLElement>) => boolean;
};

interface ShellSearchResultsProps {
  query: string;
  sections: ShellSearchSection[];
  aiStatus: ShellAiSearchStatus;
  aiEnabled: boolean;
  onSelectResult: (action: ShellSearchAction) => void;
}

export const ShellSearchResults = forwardRef<ShellSearchResultsHandle, ShellSearchResultsProps>(
  function ShellSearchResults({ query, sections, aiStatus, aiEnabled, onSelectResult }, ref) {
    const flatResults = useMemo(() => flattenShellSearchResults(sections), [sections]);
    const topResult = useMemo(() => getTopSearchResult(sections), [sections]);
    const [activeResultId, setActiveResultId] = useState<string | null>(null);

    useEffect(() => {
      setActiveResultId(flatResults[0]?.id ?? null);
    }, [flatResults, query]);

    const activeIndex = flatResults.findIndex((result) => result.id === activeResultId);
    const activeResult =
      (activeIndex >= 0 ? flatResults[activeIndex] : null) ?? topResult ?? null;

    const browseRef = useRef({ activeResultId, flatResults, onSelectResult, topResult });
    browseRef.current = { activeResultId, flatResults, onSelectResult, topResult };

    const displaySections = useMemo(() => {
      if (!query.trim() || !topResult) {
        return sections;
      }

      return sections.map((section) => ({
        ...section,
        results: section.results.filter((result) => result.id !== topResult.id),
      }));
    }, [query, sections, topResult]);

    useImperativeHandle(ref, () => ({
      handleSearchKeyDown: (event) => {
        const { activeResultId: currentId, flatResults: fr, onSelectResult: select, topResult: top } =
          browseRef.current;

        if (event.key === "ArrowDown") {
          event.preventDefault();
          if (fr.length === 0) {
            return true;
          }

          const idx = fr.findIndex((r) => r.id === currentId);
          const nextIndex = idx < 0 ? 0 : (idx + 1) % fr.length;
          setActiveResultId(fr[nextIndex]?.id ?? null);
          return true;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          if (fr.length === 0) {
            return true;
          }

          const idx = fr.findIndex((r) => r.id === currentId);
          const nextIndex = idx < 0 ? fr.length - 1 : (idx - 1 + fr.length) % fr.length;
          setActiveResultId(fr[nextIndex]?.id ?? null);
          return true;
        }

        if (event.key === "Enter") {
          const picked = fr.find((r) => r.id === currentId) ?? top ?? fr[0];
          if (!picked) {
            return false;
          }

          event.preventDefault();
          select(picked.action);
          return true;
        }

        return false;
      },
    }));

    return (
      <div className="shell-search-results">
        <small className="shell-search-results__hint">{getShellSearchHint(aiStatus, aiEnabled)}</small>

        {query.trim() && topResult ? (
          <div className="search-panel__best-match">
            <div className="section-row">
              <p className="section-title">Best match</p>
              <small>{topResult.actionLabel}</small>
            </div>
            <SearchResultButton
              result={topResult}
              active={activeResultId === topResult.id}
              onHover={() => setActiveResultId(topResult.id)}
              onSelect={() => onSelectResult(topResult.action)}
            />
          </div>
        ) : null}

        <ScrollArea className="shell-search-results__scroll">
          <div className="search-panel__results shell-search-results__grid">
            {displaySections.map((section) => (
              <section key={section.id} className="search-panel__section">
                <div className="section-row">
                  <p className="section-title">{section.label}</p>
                  <small>
                    {section.results.length > 0
                      ? `${section.results.length} result${section.results.length === 1 ? "" : "s"}`
                      : "Ready"}
                  </small>
                </div>

                {section.results.length > 0 ? (
                  section.results.map((result) => (
                    <SearchResultButton
                      key={result.id}
                      result={result}
                      active={activeResultId === result.id}
                      onHover={() => setActiveResultId(result.id)}
                      onSelect={() => onSelectResult(result.action)}
                    />
                  ))
                ) : (
                  <div className="search-panel__empty">{section.emptyLabel}</div>
                )}
              </section>
            ))}
          </div>
        </ScrollArea>

        <StatusBar className="search-panel__status shell-search-results__status">
          <span>
            {flatResults.length} indexed match{flatResults.length === 1 ? "" : "es"}
          </span>
          <span>{activeResult ? activeResult.title : "Type to search"}</span>
          <span>
            {getShellSearchStatusLabel(aiStatus, aiEnabled)} | Enter opens | Arrows move | Esc clears
          </span>
        </StatusBar>
      </div>
    );
  }
);
