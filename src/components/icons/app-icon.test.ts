import { describe, expect, it } from "vitest";
import { ICON_RENDER_SIZES, MICRO_DETAIL_BELOW, resolveIconDetail } from "./app-icon";

describe("resolveIconDetail", () => {
  it("simplifies below the Windows small-icon tier", () => {
    expect(resolveIconDetail(13)).toBe("micro");
    expect(resolveIconDetail(14)).toBe("micro");
    expect(resolveIconDetail(16)).toBe("micro");
    expect(resolveIconDetail(18)).toBe("micro");
    expect(resolveIconDetail(20)).toBe("micro");
  });

  it("carries full detail at the sizes Windows 11 actually renders", () => {
    expect(resolveIconDetail(24)).toBe("full");
    expect(resolveIconDetail(32)).toBe("full");
    expect(resolveIconDetail(48)).toBe("full");
  });

  it("switches exactly at the documented boundary", () => {
    expect(resolveIconDetail(MICRO_DETAIL_BELOW - 1)).toBe("micro");
    expect(resolveIconDetail(MICRO_DETAIL_BELOW)).toBe("full");
  });

  it("classifies every size the shell renders", () => {
    for (const size of ICON_RENDER_SIZES) {
      expect(["micro", "full"]).toContain(resolveIconDetail(size));
    }
  });
});
