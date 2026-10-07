import { describe, expect, it } from "vitest";
import { getBrowserTitleFromUrl, HISTORY_URL, NEW_TAB_URL, normalizeBrowserAddress } from "@/lib/browser/urlUtils";
import { isWebUrl, sanitizeBrowserData } from "@/stores/browser-store";

describe("internal browser pages", () => {
  it("keeps exact internal pages and searches for anything else", () => {
    expect(normalizeBrowserAddress("browser://newtab")).toBe(NEW_TAB_URL);
    expect(normalizeBrowserAddress("BROWSER://HISTORY")).toBe(HISTORY_URL);
    expect(normalizeBrowserAddress("browser://settings")).toContain("google.com/search");
  });

  it("titles internal pages", () => {
    expect(getBrowserTitleFromUrl(NEW_TAB_URL)).toBe("New tab");
    expect(getBrowserTitleFromUrl(HISTORY_URL)).toBe("History");
  });
});

describe("browser storage is untrusted on read", () => {
  it("only accepts http(s) URLs", () => {
    expect(isWebUrl("https://example.com")).toBe(true);
    expect(isWebUrl("http://example.com")).toBe(true);
    expect(isWebUrl("javascript:alert(1)")).toBe(false);
    expect(isWebUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isWebUrl("file:///C:/Windows")).toBe(false);
    expect(isWebUrl(42)).toBe(false);
  });

  it("drops tampered favorites and history entries", () => {
    const clean = sanitizeBrowserData({
      favorites: [
        { url: "javascript:alert(document.cookie)", label: "Evil" },
        { url: "https://github.com/Taan1el", label: "GitHub" },
        { url: "https://example.com", label: 12 },
        null,
      ],
      history: [
        { url: "data:text/html,hi", title: "x", visitedAt: 1 },
        { url: "https://wikipedia.org/", title: "Wikipedia", visitedAt: 2 },
        { url: "https://no-timestamp.dev/", title: "x" },
      ],
    });

    expect(clean.favorites).toEqual([
      { url: "https://github.com/Taan1el", label: "GitHub" },
      { url: "https://example.com", label: "example.com" },
    ]);
    expect(clean.history).toEqual([{ url: "https://wikipedia.org/", title: "Wikipedia", visitedAt: 2 }]);
  });

  it("caps label length", () => {
    const clean = sanitizeBrowserData({ favorites: [{ url: "https://a.dev", label: "x".repeat(500) }], history: [] });
    expect(clean.favorites[0].label).toHaveLength(80);
  });

  it("falls back to defaults for garbage", () => {
    const clean = sanitizeBrowserData("not an object");
    expect(clean.favorites.length).toBeGreaterThan(0);
    expect(clean.history).toEqual([]);
  });
});
