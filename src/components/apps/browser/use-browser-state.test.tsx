// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useBrowserState } from "@/components/apps/browser/useBrowserState";
import { NEW_TAB_URL } from "@/lib/browser/urlUtils";
import { useDeviceStore } from "@/stores/device-store";
import type { FileSystemRecord } from "@/types/system";

const REMOTE = "https://en.wikipedia.org/wiki/Test";

const nodes: FileSystemRecord = {
  "/": { kind: "directory", path: "/", name: "/", createdAt: 1, updatedAt: 1 },
  "/Media/photo.png": {
    kind: "file",
    path: "/Media/photo.png",
    name: "photo.png",
    mimeType: "image/png",
    extension: "png",
    source: "data:image/png;base64,AAAA",
    createdAt: 1,
    updatedAt: 1,
  },
};

beforeEach(() => {
  useDeviceStore.getState().resetDevice();
});

afterEach(() => {
  cleanup();
  useDeviceStore.getState().resetDevice();
});

describe("useBrowserState offline gate", () => {
  it("loads a web page while the device is connected", () => {
    const { result } = renderHook(() => useBrowserState({ initialAddress: REMOTE, nodes }));

    expect(result.current.viewMode).toBe("web");
    expect(result.current.loadState).toBe("loading");
    expect(result.current.fallback).toBeNull();
  });

  it("shows the offline page instead of loading in airplane mode", () => {
    useDeviceStore.getState().setAirplaneMode(true);
    const { result } = renderHook(() => useBrowserState({ initialAddress: REMOTE, nodes }));

    expect(result.current.viewMode).toBe("fallback");
    expect(result.current.loadState).toBe("blocked");
    expect(result.current.fallback?.offlineStatus).toBe("airplane");
    expect(result.current.fallback?.url).toBe(REMOTE);
  });

  it("tells Wi-Fi off from a real outage", () => {
    useDeviceStore.getState().setWifiEnabled(false);
    const wifiOff = renderHook(() => useBrowserState({ initialAddress: REMOTE, nodes }));
    expect(wifiOff.result.current.fallback?.offlineStatus).toBe("wifi-off");

    useDeviceStore.getState().resetDevice();
    useDeviceStore.getState().setBrowserOnline(false);
    const outage = renderHook(() => useBrowserState({ initialAddress: REMOTE, nodes }));
    expect(outage.result.current.fallback?.offlineStatus).toBe("no-internet");
  });

  it("goes offline while a page is open and recovers by itself", () => {
    const { result } = renderHook(() => useBrowserState({ initialAddress: REMOTE, nodes }));
    expect(result.current.viewMode).toBe("web");

    act(() => useDeviceStore.getState().setAirplaneMode(true));
    expect(result.current.viewMode).toBe("fallback");
    expect(result.current.fallback?.offlineStatus).toBe("airplane");

    act(() => useDeviceStore.getState().setAirplaneMode(false));
    expect(result.current.viewMode).toBe("web");
    expect(result.current.loadState).toBe("loading");
    expect(result.current.fallback).toBeNull();
  });

  it("does not count being offline as a failure of the site", () => {
    useDeviceStore.getState().setAirplaneMode(true);
    const { result } = renderHook(() => useBrowserState({ initialAddress: REMOTE, nodes }));

    expect(result.current.failureHistory).toHaveLength(0);
  });

  it("still opens local files offline", () => {
    useDeviceStore.getState().setAirplaneMode(true);
    const { result } = renderHook(() => useBrowserState({ initialAddress: "/Media/photo.png", nodes }));

    expect(result.current.viewMode).toBe("web");
    expect(result.current.loadState).toBe("ready");
    expect(result.current.fallback).toBeNull();
  });

  it("still shows the browser's own pages offline", () => {
    useDeviceStore.getState().setAirplaneMode(true);
    const { result } = renderHook(() => useBrowserState({ initialAddress: NEW_TAB_URL, nodes }));

    expect(result.current.isInternal).toBe(true);
    expect(result.current.loadState).toBe("ready");
  });
});
