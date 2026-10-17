import { describe, expect, it } from "vitest";
import { buildOfflineFallback } from "@/lib/browser/offline";

describe("buildOfflineFallback", () => {
  it("names the cause for each offline state", () => {
    expect(buildOfflineFallback("https://example.com", "airplane").message).toBe("Airplane mode is on");
    expect(buildOfflineFallback("https://example.com", "wifi-off").message).toBe("Wi-Fi is turned off");
    expect(buildOfflineFallback("https://example.com", "no-internet").message).toBe(
      "You're not connected to the internet"
    );
  });

  it("is marked offline, keeps the address and offers no proxy retry", () => {
    const fallback = buildOfflineFallback("https://example.com/page", "airplane");

    expect(fallback.offlineStatus).toBe("airplane");
    expect(fallback.url).toBe("https://example.com/page");
    expect(fallback.retryProxyMode).toBeNull();
    expect(fallback.title).toBe("No internet");
  });
});
