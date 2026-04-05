import { SearchInput } from "@/components/apps/app-layout";

interface StartSearchProps {
  query: string;
  onQueryChange: (value: string) => void;
}

export function StartSearch({ query, onQueryChange }: StartSearchProps) {
  return (
    <SearchInput
      aria-label="Search apps, files, and links"
      className="start-menu__search-field"
      containerClassName="start-menu__search-launcher"
      placeholder="Search apps, files, links, and portfolio content"
      value={query}
      onChange={(event) => onQueryChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onQueryChange("");
        }
      }}
    />
  );
}
