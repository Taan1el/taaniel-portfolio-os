import { describe, expect, it } from "vitest";
import { getUrlOrSearch } from "@/lib/browser/url";

describe("getUrlOrSearch", () => {
  it("normalizes hostnames to https urls", () => {
    expect(getUrlOrSearch("github.com/Taan1el")).toBe("https://github.com/Taan1el");
  });

  it("returns full urls unchanged when they are already valid", () => {
    expect(getUrlOrSearch("https://example.com/test?q=1")).toBe("https://example.com/test?q=1");
  });

  it("converts plain text into a search query", () => {
    expect(getUrlOrSearch("frontend case study")).toBe(
      "https://duckduckgo.com/?q=frontend%20case%20study"
    );
  });

  it("treats dangerous protocols as search input instead of executable urls", () => {
    expect(getUrlOrSearch("javascript:alert(1)")).toBe(
      "https://duckduckgo.com/?q=javascript%3Aalert(1)"
    );
  });
});
