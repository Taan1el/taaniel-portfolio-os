import { describe, expect, it } from "vitest";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { buildShellSearchIndex, queryShellSearch } from "@/lib/shell-search";

describe("shell search", () => {
  it("indexes apps, files, links, and portfolio content", () => {
    const index = buildShellSearchIndex(buildSeedFileSystem());
    const sections = queryShellSearch(index, "music");

    expect(sections.find((section) => section.id === "apps")?.results.some((result) => result.title.includes("Music"))).toBe(true);
    expect(sections.find((section) => section.id === "files")?.results.length).toBeGreaterThan(0);
  });

  it("returns curated defaults when query is empty", () => {
    const index = buildShellSearchIndex(buildSeedFileSystem());
    const sections = queryShellSearch(index, "");

    expect(sections).toHaveLength(4);
    expect(sections.every((section) => section.results.length > 0)).toBe(true);
  });
});

