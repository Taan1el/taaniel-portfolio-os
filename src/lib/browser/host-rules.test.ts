import { describe, expect, it } from "vitest";
import { getBrowserHostRule, isLikelyEmbeddable } from "@/lib/browser/host-rules";

describe("getBrowserHostRule", () => {
  it("marks Google igu pages as direct-friendly", () => {
    expect(getBrowserHostRule("https://www.google.com/webhp?igu=1").disposition).toBe("direct");
  });

  it("marks GitHub as a known blocked host", () => {
    const rule = getBrowserHostRule("https://github.com/Taan1el");

    expect(rule.disposition).toBe("blocked");
    expect(rule.retryProxyMode).toBe("allorigins");
  });

  it("leaves unknown hosts in the unknown bucket", () => {
    expect(getBrowserHostRule("https://example.com/portfolio").disposition).toBe("unknown");
  });

  it("exposes embeddability detection for the Browser runtime", () => {
    expect(isLikelyEmbeddable("https://www.google.com/webhp?igu=1")).toBe(true);
    expect(isLikelyEmbeddable("https://github.com/Taan1el")).toBe(false);
  });
});
