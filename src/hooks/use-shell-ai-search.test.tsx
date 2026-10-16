// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useShellAiSearch } from "@/hooks/use-shell-ai-search";
import type { ShellSearchResult, ShellSearchSection } from "@/lib/shell-search";
import { useDeviceStore } from "@/stores/device-store";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

class FakeWorker {
  static instances: FakeWorker[] = [];
  messages: unknown[] = [];
  terminated = false;

  constructor() {
    FakeWorker.instances.push(this);
  }

  addEventListener() {}
  removeEventListener() {}

  postMessage(message: unknown) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }
}

function result(id: string): ShellSearchResult {
  return {
    id,
    section: "apps",
    type: "app",
    title: id,
    subtitle: "",
    tokens: id,
    action: { type: "launch-app", appId: "settings" },
    actionLabel: "Open",
    aliases: [],
    semanticTags: [],
    score: 10,
    matchMode: "keyword",
    matchedTerms: [],
  };
}

const sections: ShellSearchSection[] = [
  { id: "apps", label: "Apps", emptyLabel: "", results: [result("one"), result("two")] },
];

function renderSearch(query = "volume") {
  return renderHook(() => useShellAiSearch({ query, sections }));
}

beforeEach(() => {
  FakeWorker.instances = [];
  vi.stubGlobal("Worker", FakeWorker);
  useDeviceStore.getState().resetDevice();
  useSystemSettingsStore.getState().resetSettings();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useDeviceStore.getState().resetDevice();
  useSystemSettingsStore.getState().resetSettings();
});

describe("useShellAiSearch network and power gate", () => {
  it("starts the reranker while online", () => {
    const { result: hook } = renderSearch();

    expect(FakeWorker.instances).toHaveLength(1);
    expect(FakeWorker.instances[0].messages).toHaveLength(1);
    expect(hook.current.aiStatus).toBe("warming");
  });

  it("never starts the reranker in airplane mode", () => {
    useDeviceStore.getState().setAirplaneMode(true);
    const { result: hook } = renderSearch();

    expect(FakeWorker.instances).toHaveLength(0);
    expect(hook.current.aiStatus).toBe("fallback");
    expect(hook.current.sections).toBe(sections);
  });

  it("never starts the reranker with Wi-Fi off or during an outage", () => {
    useDeviceStore.getState().setWifiEnabled(false);
    renderSearch();
    useDeviceStore.getState().resetDevice();
    useDeviceStore.getState().setBrowserOnline(false);
    renderSearch();

    expect(FakeWorker.instances).toHaveLength(0);
  });

  it("never starts the reranker under battery saver", () => {
    useSystemSettingsStore.getState().setBatterySaver(true);
    const { result: hook } = renderSearch();

    expect(FakeWorker.instances).toHaveLength(0);
    expect(hook.current.aiStatus).toBe("fallback");
  });

  it("stops a running reranker when the device goes offline", () => {
    const { result: hook } = renderSearch();
    const worker = FakeWorker.instances[0];

    act(() => useDeviceStore.getState().setAirplaneMode(true));
    expect(worker.terminated).toBe(true);
    expect(hook.current.aiStatus).toBe("fallback");
  });

  it("resumes with a fresh reranker once the network is back", () => {
    useDeviceStore.getState().setAirplaneMode(true);
    const { result: hook } = renderSearch();
    expect(FakeWorker.instances).toHaveLength(0);

    act(() => useDeviceStore.getState().setAirplaneMode(false));
    expect(FakeWorker.instances).toHaveLength(1);
    expect(hook.current.aiStatus).toBe("warming");
  });

  it("stays local for short queries whatever the network", () => {
    useDeviceStore.getState().setAirplaneMode(true);
    const { result: hook } = renderSearch("ab");

    expect(hook.current.aiStatus).toBe("local");
    expect(hook.current.aiEnabled).toBe(false);
  });
});
