// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_START_PINS, useStartMenuStore } from "@/stores/start-menu-store";

const KEY = "taaniel-os-start-v1";

async function rehydrateFrom(saved: unknown) {
  localStorage.setItem(KEY, JSON.stringify({ state: saved, version: 0 }));
  await useStartMenuStore.persist.rehydrate();
  return useStartMenuStore.getState();
}

describe("Start menu pins", () => {
  beforeEach(() => {
    localStorage.clear();
    useStartMenuStore.setState({ pinned: DEFAULT_START_PINS, view: "category" });
  });

  it("pins once, unpins, and moves a pin to the front", () => {
    const { pin, unpin, moveToFront } = useStartMenuStore.getState();
    pin("snake");
    pin("snake");
    expect(useStartMenuStore.getState().pinned.filter((id) => id === "snake")).toHaveLength(1);

    moveToFront("snake");
    expect(useStartMenuStore.getState().pinned[0]).toBe("snake");

    unpin("snake");
    expect(useStartMenuStore.getState().pinned).not.toContain("snake");
  });

  it("restores saved pins and view, dropping junk", async () => {
    const state = await rehydrateFrom({ pinned: ["about", 7, "about", null, "doom"], view: "list" });
    expect(state.pinned).toEqual(["about", "doom"]);
    expect(state.view).toBe("list");
  });

  it("falls back when the saved shape is wrong", async () => {
    const state = await rehydrateFrom({ pinned: "about", view: "<script>" });
    expect(state.pinned).toEqual(DEFAULT_START_PINS);
    expect(state.view).toBe("category");
  });
});
