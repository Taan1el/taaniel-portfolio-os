// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DisplayFilterOverlay } from "@/components/shell/display-filter-overlay";
import { MAX_DIM_ALPHA } from "@/lib/display-filter";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

const dim = () => document.body.querySelector<HTMLElement>(".w11-display-filter--dim");
const warm = () => document.body.querySelector<HTMLElement>(".w11-display-filter--warm");

beforeEach(() => {
  useSystemSettingsStore.getState().resetSettings();
});

afterEach(() => {
  cleanup();
  useSystemSettingsStore.getState().resetSettings();
});

describe("DisplayFilterOverlay", () => {
  it("renders nothing at full brightness with night light off", () => {
    render(<DisplayFilterOverlay />);
    expect(dim()).toBeNull();
    expect(warm()).toBeNull();
  });

  it("dims the screen in proportion to brightness", () => {
    render(<DisplayFilterOverlay />);
    act(() => useSystemSettingsStore.getState().setBrightness(50));

    expect(dim()?.style.backgroundColor).toBe("rgba(0, 0, 0, 0.35)");
  });

  it("never covers the screen more than the cap, even at zero brightness", () => {
    render(<DisplayFilterOverlay />);
    act(() => useSystemSettingsStore.getState().setBrightness(0));

    const alpha = Number(/,\s*([\d.]+)\)$/.exec(dim()!.style.backgroundColor)![1]);
    expect(alpha).toBe(MAX_DIM_ALPHA);
    expect(alpha).toBeLessThanOrEqual(0.7);
  });

  it("warms the screen with a multiply layer while night light is on", () => {
    render(<DisplayFilterOverlay />);
    act(() => useSystemSettingsStore.getState().setNightLight(true));

    expect(warm()?.style.backgroundColor).toBe("rgb(255, 220, 160)");
    expect(warm()?.style.mixBlendMode).toBe("multiply");

    act(() => useSystemSettingsStore.getState().setNightLightStrength(100));
    expect(warm()?.style.backgroundColor).toBe("rgb(255, 185, 65)");

    act(() => useSystemSettingsStore.getState().setNightLight(false));
    expect(warm()).toBeNull();
  });

  it("lets every click through and stays out of the accessibility tree", () => {
    render(<DisplayFilterOverlay />);
    act(() => {
      useSystemSettingsStore.getState().setBrightness(20);
      useSystemSettingsStore.getState().setNightLight(true);
    });

    for (const layer of [dim(), warm()]) {
      expect(layer?.style.pointerEvents).toBe("none");
      expect(layer?.getAttribute("aria-hidden")).toBe("true");
      expect(layer?.style.position).toBe("fixed");
    }
  });

  it("portals to <body>, outside the desktop's own tree", () => {
    const view = render(<DisplayFilterOverlay />);
    act(() => useSystemSettingsStore.getState().setBrightness(40));

    expect(view.container.querySelector(".w11-display-filter")).toBeNull();
    expect(dim()?.parentElement).toBe(document.body);
  });

  it("dims a little under battery saver even at full brightness", () => {
    render(<DisplayFilterOverlay />);
    act(() => useSystemSettingsStore.getState().setBatterySaver(true));

    expect(dim()).not.toBeNull();
  });
});
