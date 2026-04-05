import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { ExternalLink, FileText, Folder } from "lucide-react";
import { SearchInput, StatusBar } from "@/components/apps/app-layout";
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

function getSearchHint(aiStatus: ShellAiSearchStatus, aiEnabled: boolean) {
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

function getSearchStatusLabel(aiStatus: ShellAiSearchStatus, aiEnabled: boolean) {
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

interface SearchPanelProps {
  query: string;
  sections: ShellSearchSection[];
  aiStatus: ShellAiSearchStatus;
  aiEnabled: boolean;
  onQueryChange: (query: string) => void;
  onSelectResult: (action: ShellSearchAction) => void;
  onRequestClose: () => void;
}

export function SearchPanel({
  query,
  sections,
  aiStatus,
  aiEnabled,
  onQueryChange,
  onSelectResult,
  onRequestClose,
}: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const flatResults = useMemo(() => flattenShellSearchResults(sections), [sections]);
  const topResult = useMemo(() => getTopSearchResult(sections), [sections]);
  const [activeResultId, setActiveResultId] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveResultId(flatResults[0]?.id ?? null);
  }, [flatResults, query]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target) {
        return;
      }

      if (
        panelRef.current?.contains(target) ||
        target.closest(".taskbar__search") ||
        target.closest(".start-menu__search-launcher")
      ) {
        return;
      }

      onRequestClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onRequestClose]);

  const activeIndex = flatResults.findIndex((result) => result.id === activeResultId);
  const activeResult =
    (activeIndex >= 0 ? flatResults[activeIndex] : null) ?? topResult ?? null;

  const displaySections = useMemo(() => {
    if (!query.trim() || !topResult) {
      return sections;
    }

    return sections.map((section) => ({
      ...section,
      results: section.results.filter((result) => result.id !== topResult.id),
    }));
  }, [query, sections, topResult]);

  const moveSelection = (offset: number) => {
    if (flatResults.length === 0) {
      return;
    }

    const nextIndex =
      activeIndex < 0 ? 0 : (activeIndex + offset + flatResults.length) % flatResults.length;
    setActiveResultId(flatResults[nextIndex]?.id ?? null);
  };

  return (
    <motion.section
      ref={panelRef}
      className="search-panel"
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.18 }}
    >
      <div className="search-panel__header">
        <SearchInput
          ref={inputRef}
          containerClassName="search-panel__input"
          placeholder="Search apps, files, links, notes, and portfolio content"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              moveSelection(1);
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              moveSelection(-1);
              return;
            }

            if (event.key === "Enter" && activeResult) {
              event.preventDefault();
              onSelectResult(activeResult.action);
              return;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              onRequestClose();
            }
          }}
        />
        <small className="search-panel__hint">{getSearchHint(aiStatus, aiEnabled)}</small>
      </div>

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

      <div className="search-panel__results">
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

      <StatusBar className="search-panel__status">
        <span>{flatResults.length} indexed match{flatResults.length === 1 ? "" : "es"}</span>
        <span>{activeResult ? activeResult.title : "Type to search"}</span>
        <span>{getSearchStatusLabel(aiStatus, aiEnabled)} | Enter opens | Arrows move | Esc closes</span>
      </StatusBar>
    </motion.section>
  );
}
