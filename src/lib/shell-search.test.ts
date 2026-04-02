import { describe, expect, it } from "vitest";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { buildShellSearchIndex, getTopSearchResult, queryShellSearch } from "@/lib/shell-search";

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

  it("surfaces note content through local semantic indexing", () => {
    const index = buildShellSearchIndex(buildSeedFileSystem());
    const sections = queryShellSearch(index, "latest portfolio updates");
    const topResult = getTopSearchResult(sections);

    expect(topResult?.title).toContain("To do list");
    expect(topResult?.preview?.toLowerCase()).toContain("latest portfolio updates");
  });

  it("handles action-oriented folder queries without needing web search", () => {
    const index = buildShellSearchIndex(buildSeedFileSystem());
    const sections = queryShellSearch(index, "open photography folder");
    const topResult = getTopSearchResult(sections);

    expect(topResult?.action.type).toBe("open-path");
    expect(topResult && "path" in topResult.action ? topResult.action.path : null).toBe("/Media/Photography");
  });

  it("ranks project summaries for semantic portfolio queries", () => {
    const index = buildShellSearchIndex(buildSeedFileSystem());
    const sections = queryShellSearch(index, "0 offer fintech email campaign");
    const portfolioSection = sections.find((section) => section.id === "portfolio");

    expect(portfolioSection?.results.some((result) => result.title.includes("Fintech Email Campaign"))).toBe(true);
  });
});
