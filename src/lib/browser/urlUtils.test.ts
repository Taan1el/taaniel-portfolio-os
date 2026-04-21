import { describe, expect, it } from "vitest";
import {
  getUrlOrSearch,
  normalizeBrowserAddress,
  normalizeEmbeddableBrowserUrl,
} from "@/lib/browser/urlUtils";

describe("getUrlOrSearch", () => {
  it("normalizes hostnames to https urls", () => {
    expect(getUrlOrSearch("github.com/Taan1el")).toBe("https://github.com/Taan1el");
  });

  it("returns full urls unchanged when they are already valid", () => {
    expect(getUrlOrSearch("https://example.com/test?q=1")).toBe("https://example.com/test?q=1");
  });

  it("converts plain text into a search query", () => {
    expect(getUrlOrSearch("frontend case study")).toBe(
      "https://www.google.com/search?igu=1&q=frontend%20case%20study"
    );
  });

  it("treats dangerous protocols as search input instead of executable urls", () => {
    expect(getUrlOrSearch("javascript:alert(1)")).toBe(
      "https://www.google.com/search?igu=1&q=javascript%3Aalert(1)"
    );
  });
});

describe("normalizeBrowserAddress", () => {
  it("normalizes local filesystem paths separately from web addresses", () => {
    expect(normalizeBrowserAddress("Documents/Notes")).toBe(
      "https://www.google.com/search?igu=1&q=Documents%2FNotes"
    );
    expect(normalizeBrowserAddress("/Documents/Notes")).toBe("/Documents/Notes");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeBrowserAddress("   ")).toBe("");
  });
});

describe("normalizeEmbeddableBrowserUrl", () => {
  it("normalizes Google home into the iframe-friendly variant", () => {
    expect(normalizeEmbeddableBrowserUrl("https://www.google.com/")).toBe(
      "https://www.google.com/webhp?igu=1"
    );
  });

  it("preserves search pages while forcing Google iframe mode", () => {
    expect(
      normalizeEmbeddableBrowserUrl("https://www.google.com/search?q=portfolio")
    ).toBe("https://www.google.com/search?q=portfolio&igu=1");
  });
});
