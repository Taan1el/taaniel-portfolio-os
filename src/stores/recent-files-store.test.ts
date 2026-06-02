// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { sanitizeRecentPaths } from "@/stores/recent-files-store";

describe("recent files persistence sanitizers", () => {
  it("keeps only non-root string paths, normalizes them, and removes duplicates", () => {
    expect(
      sanitizeRecentPaths([
        "Documents\\Notes\\plan.md",
        "/Documents/Notes/plan.md",
        "",
        "/",
        null,
        42,
        "/Media/photo.jpg/",
      ]),
    ).toEqual(["/Documents/Notes/plan.md", "/Media/photo.jpg"]);
  });

  it("caps persisted recent paths to the recent-file limit", () => {
    const paths = Array.from({ length: 16 }, (_, index) => `/Documents/file-${index}.md`);

    expect(sanitizeRecentPaths(paths)).toHaveLength(12);
    expect(sanitizeRecentPaths(paths).at(-1)).toBe("/Documents/file-11.md");
  });

  it("falls back to an empty list for non-array persisted values", () => {
    expect(sanitizeRecentPaths({ recentPaths: ["/Documents/file.md"] })).toEqual([]);
  });
});
