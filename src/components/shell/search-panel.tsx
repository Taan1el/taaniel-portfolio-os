import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { ExternalLink, FileText, Folder } from "lucide-react";
import { SearchInput } from "@/components/apps/app-layout";
import type { ShellSearchAction, ShellSearchResult, ShellSearchSection } from "@/lib/shell-search";

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
      {result.type === "folder" ? <Folder size={16} /> : result.type === "link" ? <ExternalLink size={16} /> : <FileText size={16} />}
    </span>
  );
}

interface SearchPanelProps {
  query: string;
  sections: ShellSearchSection[];
  onQueryChange: (query: string) => void;
  onSelectResult: (action: ShellSearchAction) => void;
  onRequestClose: () => void;
}

export function SearchPanel({
  query,
  sections,
  onQueryChange,
  onSelectResult,
  onRequestClose,
}: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const topResult = useMemo(
    () =>
      sections
        .flatMap((section) => section.results)
        .sort((a, b) => b.score - a.score)[0] ?? null,
    [sections]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target) {
        return;
      }

      if (panelRef.current?.contains(target) || target.closest(".taskbar__search")) {
        return;
      }

      onRequestClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onRequestClose]);

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
          placeholder="Search apps, files, links, and portfolio content"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && topResult) {
              onSelectResult(topResult.action);
            }
          }}
        />
        <small className="search-panel__hint">
          Foundation for future semantic and AI-powered search. Right now this uses a shared shell index.
        </small>
      </div>

      <div className="search-panel__results">
        {sections.map((section) => (
          <section key={section.id} className="search-panel__section">
            <div className="section-row">
              <p className="section-title">{section.label}</p>
              <small>{section.results.length > 0 ? `${section.results.length} result${section.results.length === 1 ? "" : "s"}` : "Ready"}</small>
            </div>

            {section.results.length > 0 ? (
              section.results.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  className="search-result"
                  onClick={() => onSelectResult(result.action)}
                >
                  <SearchResultIcon result={result} />
                  <span className="search-result__meta">
                    <strong title={result.title}>{result.title}</strong>
                    <small title={result.subtitle}>{result.subtitle}</small>
                  </span>
                </button>
              ))
            ) : (
              <div className="search-panel__empty">{section.emptyLabel}</div>
            )}
          </section>
        ))}
      </div>
    </motion.section>
  );
}

