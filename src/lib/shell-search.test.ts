import { describe, expect, it } from "vitest";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import {
  applyShellSearchAiRankings,
  buildShellSearchAiCandidates,
  buildShellSearchIndex,
  getTopSearchResult,
  queryShellSearch,
} from "@/lib/shell-search";

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

  it("surfaces the default note file in file search", () => {
    const index = buildShellSearchIndex(buildSeedFileSystem());
    const sections = queryShellSearch(index, "Notes To-do");
    const fileSection = sections.find((section) => section.id === "files");
    const noteHit = fileSection?.results.find(
      (result) => result.action.type === "open-path" && result.action.path.includes("/Documents/Notes/")
    );

    expect(noteHit).toBeDefined();
    expect(noteHit?.action.type).toBe("open-path");
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

  it("builds AI candidates from local search results", () => {
    const index = buildShellSearchIndex(buildSeedFileSystem());
    const sections = queryShellSearch(index, "play arcade game");
    const candidates = buildShellSearchAiCandidates(sections, 6);

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((candidate) => candidate.content.length > 0)).toBe(true);
  });

  it("keeps exact matches stable while applying AI reranking boosts", () => {
    const index = buildShellSearchIndex(buildSeedFileSystem());
    const sections = queryShellSearch(index, "music player");
    const rerankedSections = applyShellSearchAiRankings(sections, [
      { id: "app:music", similarity: 0.9 },
      { id: "app:browser", similarity: 0.99 },
    ]);
    const topResult = getTopSearchResult(rerankedSections);

    expect(topResult?.id).toBe("app:music");
    expect(topResult?.matchMode).toBe("exact");
  });
});
