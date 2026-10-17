import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CaseSensitive, ChevronDown, ChevronUp, Regex, X } from "lucide-react";
import type { FindOptions } from "@/components/apps/terminal/terminal-session";
import { cn } from "@/lib/utils";

interface TerminalFindBarProps {
  /** Changes when the active tab does, so the search is run again on the tab now in front. */
  tabKey: string;
  /** Goes up each time the person asks for Find again, to bring focus back to the box. */
  focusRequest: number;
  result: { index: number; count: number } | null;
  onSearch: (term: string, direction: 1 | -1, options: FindOptions, incremental: boolean) => void;
  onClear: () => void;
  /** Closes the bar. The app puts focus back in the terminal. */
  onClose: () => void;
}

/** What a screen reader hears after each search. */
export function describeSearchResult(term: string, result: { index: number; count: number } | null): string {
  if (!term) return "";
  if (!result) return "";
  if (result.count === 0) return "No results";
  if (result.index < 0) return `${result.count} matches`;
  return `${result.index + 1} of ${result.count}`;
}

/** Find in the scrollback, as Windows Terminal's search box does: next and previous, match case, regular expressions. */
export function TerminalFindBar({ tabKey, focusRequest, result, onSearch, onClear, onClose }: TerminalFindBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [term, setTerm] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regex, setRegex] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusRequest]);

  // A different tab has different text: search it too. (Runs on mount as well, which is harmless: the term is empty then.)
  useEffect(() => {
    if (term) onSearch(term, 1, { caseSensitive, regex }, false);
    // Only the tab changing should trigger this; typing and toggles search for themselves.
  }, [tabKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = (direction: 1 | -1, incremental = false, next: { term?: string; caseSensitive?: boolean; regex?: boolean } = {}) => {
    const value = next.term ?? term;
    if (!value) {
      onClear();
      return;
    }
    onSearch(value, direction, { caseSensitive: next.caseSensitive ?? caseSensitive, regex: next.regex ?? regex }, incremental);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    } else if (event.key === "Enter" && event.target === inputRef.current) {
      event.preventDefault();
      search(event.shiftKey ? -1 : 1);
    }
  };

  const status = describeSearchResult(term, result);

  return (
    <div role="search" aria-label="Find in terminal" className="w11-terminal__find" onKeyDown={handleKeyDown}>
      <input
        ref={inputRef}
        type="text"
        className="w11-terminal__find-input"
        aria-label="Find in terminal"
        placeholder="Find"
        spellCheck={false}
        autoComplete="off"
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          search(1, true, { term: event.target.value });
        }}
      />
      <span role="status" aria-live="polite" className={cn("w11-terminal__find-status", status === "No results" && "is-empty")}>
        {status}
      </span>
      <button
        type="button"
        className="w11-terminal__icon-button"
        aria-label="Match case"
        aria-pressed={caseSensitive}
        title="Match case"
        onClick={() => {
          setCaseSensitive(!caseSensitive);
          search(1, false, { caseSensitive: !caseSensitive });
        }}
      >
        <CaseSensitive size={16} />
      </button>
      <button
        type="button"
        className="w11-terminal__icon-button"
        aria-label="Use regular expression"
        aria-pressed={regex}
        title="Use regular expression"
        onClick={() => {
          setRegex(!regex);
          search(1, false, { regex: !regex });
        }}
      >
        <Regex size={16} />
      </button>
      <button type="button" className="w11-terminal__icon-button" aria-label="Previous match" title="Previous match (Shift+Enter)" onClick={() => search(-1)}>
        <ChevronUp size={16} />
      </button>
      <button type="button" className="w11-terminal__icon-button" aria-label="Next match" title="Next match (Enter)" onClick={() => search(1)}>
        <ChevronDown size={16} />
      </button>
      <button type="button" className="w11-terminal__icon-button" aria-label="Close find" title="Close (Esc)" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}
