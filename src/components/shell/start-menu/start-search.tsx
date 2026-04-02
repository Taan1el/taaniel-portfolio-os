import { Search } from "lucide-react";

interface StartSearchProps {
  onOpenSearch: () => void;
}

export function StartSearch({ onOpenSearch }: StartSearchProps) {
  return (
    <button type="button" className="start-menu__search-launcher" onClick={onOpenSearch}>
      <span className="search-input__icon" aria-hidden="true">
        <Search size={16} />
      </span>
      <span>Search apps, files, links, and portfolio content</span>
      <kbd>Ctrl+K</kbd>
    </button>
  );
}
