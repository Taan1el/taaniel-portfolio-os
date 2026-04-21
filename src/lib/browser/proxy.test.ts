import { describe, expect, it } from "vitest";
import {
  applyProxy,
  getProxyStrategy,
  getRetryProxyMode,
  proxyModeLabels,
} from "@/lib/browser/proxy";

describe("applyProxy", () => {
  const url = "https://example.com/docs?q=browser test";

  it("returns the original url in direct mode", () => {
    expect(applyProxy(url, "direct")).toBe(url);
  });

  it("wraps urls with allorigins in proxy mode", () => {
    expect(applyProxy(url, "allorigins")).toBe(
      "https://api.allorigins.win/raw?url=https%3A%2F%2Fexample.com%2Fdocs%3Fq%3Dbrowser%20test"
    );
  });

  it("wraps urls with the wayback pattern", () => {
    expect(applyProxy(url, "wayback")).toBe(
      "https://web.archive.org/web/*/https://example.com/docs?q=browser%20test"
    );
  });

  it("exposes structured proxy strategy metadata", () => {
    expect(getProxyStrategy("direct").kind).toBe("direct");
    expect(getProxyStrategy("allorigins").kind).toBe("proxy");
    expect(proxyModeLabels.wayback).toBe("Wayback");
  });

  it("chooses the next proxy mode for retry", () => {
    expect(getRetryProxyMode("direct")).toBe("allorigins");
    expect(getRetryProxyMode("allorigins")).toBe("wayback");
    expect(getRetryProxyMode("wayback")).toBe("allorigins");
  });
});
