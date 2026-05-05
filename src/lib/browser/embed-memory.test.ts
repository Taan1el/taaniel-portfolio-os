import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getStoredDirectEmbedOutcome,
  rememberDirectEmbedOutcome,
} from "@/lib/browser/embed-memory";

describe("browser embed memory", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("stores a direct embed outcome by hostname", () => {
    rememberDirectEmbedOutcome("https://github.com/Taan1el/taaniel-portfolio-os", "blocked");

    expect(
      getStoredDirectEmbedOutcome("https://github.com/Taan1el/another-page"),
    ).toBe("blocked");
  });

  it("expires stale records", () => {
    vi.useFakeTimers();
    rememberDirectEmbedOutcome("https://example.com", "timeout");
    vi.advanceTimersByTime(1000 * 60 * 60 * 24 * 15);

    expect(getStoredDirectEmbedOutcome("https://example.com")).toBeNull();
  });
});
