import { describe, expect, it } from "vitest";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { ensureSystemWorkspace } from "@/lib/system-workspace";
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

  it("leaves desktop shortcuts out of file results", () => {
    const index = buildShellSearchIndex(ensureSystemWorkspace(buildSeedFileSystem()));
    const files = queryShellSearch(index, "about").find((section) => section.id === "files")?.results ?? [];

    expect(files.some((result) => result.action.type === "open-path" && result.action.path.endsWith(".lnk"))).toBe(false);
  });

  it("returns curated defaults when query is empty", () => {
    const index = buildShellSearchIndex(buildSeedFileSystem());
    const sections = queryShellSearch(index, "");

    expect(sections).toHaveLength(4);
    expect(sections.every((section) => section.results.length > 0)).toBe(true);
  });

  it.each(["volume", "wifi", "airplane mode", "battery saver", "brightness", "night light", "reduce motion"])(
    "finds Settings for the device setting '%s'",
    (query) => {
      const index = buildShellSearchIndex(buildSeedFileSystem());
      const apps = queryShellSearch(index, query).find((section) => section.id === "apps");

      expect(apps?.results.some((result) => result.title === "Settings")).toBe(true);
    }
  );

  describe("Settings pages", () => {
    const index = buildShellSearchIndex(buildSeedFileSystem());
    const topApp = (query: string) =>
      queryShellSearch(index, query).find((section) => section.id === "apps")?.results[0];

    it.each([
      ["volume", "sound"],
      ["speakers", "sound"],
      ["mute", "sound"],
      ["brightness", "display"],
      ["night light", "display"],
      ["wifi", "network"],
      ["wi-fi", "network"],
      ["airplane mode", "network"],
      ["battery saver", "power"],
      ["battery", "power"],
      ["reduce motion", "accessibility"],
      ["theme", "personalization"],
      ["wallpaper", "personalization"],
      ["time zone", "time"],
      ["sound settings", "sound"],
      ["open sound settings", "sound"],
    ])("opens Settings on the matching page for '%s'", (query, section) => {
      const top = topApp(query);

      expect(top?.action).toEqual({ type: "launch-app", appId: "settings", payload: { section } });
    });

    it("keeps a bare 'settings' for the Settings app, which opens the overview", () => {
      for (const query of ["settings", "open settings"]) {
        const sections = queryShellSearch(index, query);
        const top = getTopSearchResult(sections);

        expect(top?.id).toBe("app:settings");
        expect(top?.action).toEqual({ type: "launch-app", appId: "settings" });
        expect(
          sections.flatMap((section) => section.results).some((result) => result.id.startsWith("settings:"))
        ).toBe(false);
      }
    });

    it("still lists the Settings app beside the page it points to", () => {
      const apps = queryShellSearch(index, "volume").find((section) => section.id === "apps");

      expect(apps?.results.map((result) => result.id)).toContain("app:settings");
    });

    it("lists only the pages a query actually hits", () => {
      const ids = (query: string) =>
        queryShellSearch(index, query)
          .flatMap((section) => section.results)
          .filter((result) => result.id.startsWith("settings:"))
          .map((result) => result.id);

      expect(ids("volume")).toEqual(["settings:sound"]);
      expect(ids("music")).toEqual([]);
      expect(ids("browser")).toEqual([]);
    });

    it("leaves the Browser as the answer to 'internet'", () => {
      expect(topApp("internet")?.id).toBe("app:browser");
    });

    it("keeps the pages out of the default list shown before typing", () => {
      const apps = queryShellSearch(index, "").find((section) => section.id === "apps");

      expect(apps?.results.some((result) => result.id.startsWith("settings:"))).toBe(false);
    });
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

  it("surfaces Photos app or Photography folder as top result for 'photo'", () => {
    const index = buildShellSearchIndex(buildSeedFileSystem());
    const sections = queryShellSearch(index, "photo");
    const topResult = getTopSearchResult(sections);

    expect(topResult).not.toBeNull();
    const title = topResult?.title.toLowerCase() ?? "";
    expect(title.includes("photo")).toBe(true);
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
    const sections = queryShellSearch(index, "coffee catalogue shopping cart");
    const portfolioSection = sections.find((section) => section.id === "portfolio");

    expect(portfolioSection?.results.some((result) => result.title.includes("Slow Pour"))).toBe(true);
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
