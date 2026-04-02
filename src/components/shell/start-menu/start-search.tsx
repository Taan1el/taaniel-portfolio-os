import { SearchInput } from "@/components/apps/app-layout";

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
    <SearchInput
      ref={inputRef}
      containerClassName="start-menu__search"
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
  );
}
