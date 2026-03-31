import { Search } from "lucide-react";

interface StartSearchProps {
  inputRef: React.RefObject<HTMLInputElement>;
  query: string;
  onQueryChange: (query: string) => void;
  onSubmitTopResult: () => void;
}

export function StartSearch({
  inputRef,
  query,
  onQueryChange,
  onSubmitTopResult,
}: StartSearchProps) {
  return (
    <label className="start-menu__search">
      <Search size={16} />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search apps, tools, and system folders"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onSubmitTopResult();
          }
        }}
      />
    </label>
  );
}
