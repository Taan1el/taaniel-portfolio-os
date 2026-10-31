import { describe, expect, it } from "vitest";
import {
  activateTab,
  addTab,
  canAddTab,
  closeOtherTabs,
  closeTab,
  createTab,
  createTabsState,
  cycleTab,
  duplicateTab,
  gotoTab,
  MAX_TABS,
  MAX_TITLE_LENGTH,
  neighbourTabId,
  renameTab,
  sanitizeTitle,
  tabFontSize,
  zoomTab,
  type TabsState,
} from "@/lib/terminal-tabs";

const three = (): TabsState => {
  let state = createTabsState(createTab("a", "pwsh", "/"));
  state = addTab(state, createTab("b", "cmd", "/Documents"));
  state = addTab(state, createTab("c", "pwsh", "/Media"));
  return state;
};

const ids = (state: TabsState) => state.tabs.map((tab) => tab.id).join("");

describe("terminal tabs", () => {
  it("titles a tab after its profile", () => {
    expect(createTab("a", "pwsh", "/").title).toBe("PowerShell");
    expect(createTab("a", "cmd", "/").title).toBe("Command Prompt");
  });

  it("adds a tab at the end of the strip and switches to it, whichever tab was active", () => {
    let state = createTabsState(createTab("a", "pwsh", "/"));
    state = addTab(state, createTab("b", "cmd", "/"));
    state = activateTab(state, "a");
    state = addTab(state, createTab("c", "pwsh", "/"));
    expect(ids(state)).toBe("abc");
    expect(state.activeId).toBe("c");
  });

  it("stops at the tab limit", () => {
    let state = createTabsState(createTab("t0", "pwsh", "/"));
    for (let index = 1; index < MAX_TABS + 5; index += 1) state = addTab(state, createTab(`t${index}`, "pwsh", "/"));
    expect(state.tabs).toHaveLength(MAX_TABS);
    expect(canAddTab(state)).toBe(false);
    expect(duplicateTab(state, "t0", "extra")).toBe(state);
  });

  it("duplicates a tab into a new one at the end, in the folder it is in now", () => {
    const state = duplicateTab(three(), "b", "d", "/Desktop");
    expect(ids(state)).toBe("abcd");
    expect(state.activeId).toBe("d");
    expect(state.tabs[3]).toMatchObject({ profileId: "cmd", startPath: "/Desktop", title: "Command Prompt" });
    expect(duplicateTab(three(), "missing", "d")).toEqual(three());
  });

  it("picks the neighbour when the active tab closes, and keeps the active tab when another closes", () => {
    let state = activateTab(three(), "b");
    const afterMiddle = closeTab(state, "b");
    expect(afterMiddle && [ids(afterMiddle), afterMiddle.activeId]).toEqual(["ac", "c"]);

    state = activateTab(three(), "c");
    const afterLast = closeTab(state, "c");
    expect(afterLast && [ids(afterLast), afterLast.activeId]).toEqual(["ab", "b"]);

    const afterOther = closeTab(activateTab(three(), "c"), "a");
    expect(afterOther && [ids(afterOther), afterOther.activeId]).toEqual(["bc", "c"]);
  });

  it("reports the last tab closing, so the window can close", () => {
    expect(closeTab(createTabsState(createTab("a", "pwsh", "/")), "a")).toBeNull();
    expect(closeTab(three(), "nope")).toEqual(three());
  });

  it("closes every other tab", () => {
    const state = closeOtherTabs(three(), "b");
    expect(ids(state)).toBe("b");
    expect(state.activeId).toBe("b");
    expect(closeOtherTabs(three(), "zzz")).toEqual(three());
  });

  it("cycles around the strip in both directions", () => {
    let state = activateTab(three(), "a");
    state = cycleTab(state, -1);
    expect(state.activeId).toBe("c");
    state = cycleTab(state, 1);
    expect(state.activeId).toBe("a");
    const single = createTabsState(createTab("a", "pwsh", "/"));
    expect(cycleTab(single, 1)).toBe(single);
  });

  it("goes to a tab by position and ignores positions without one", () => {
    expect(gotoTab(three(), 1).activeId).toBe("b");
    expect(gotoTab(three(), 8)).toEqual(three());
  });

  it("cleans titles a shell sets, and falls back to the profile name when empty", () => {
    expect(sanitizeTitle("  build \x1b[31m now\x07 \n ok ")).toBe("build [31m now ok");
    expect(sanitizeTitle("x".repeat(500))).toHaveLength(MAX_TITLE_LENGTH);
    expect(renameTab(three(), "b", "My shell").tabs[1].title).toBe("My shell");
    expect(renameTab(three(), "b", "   ").tabs[1].title).toBe("Command Prompt");
  });

  it("moves the focus ring with arrows, wrapping, Home and End", () => {
    const state = three();
    expect(neighbourTabId(state, "a", "ArrowLeft")).toBe("c");
    expect(neighbourTabId(state, "c", "ArrowRight")).toBe("a");
    expect(neighbourTabId(state, "b", "ArrowRight")).toBe("c");
    expect(neighbourTabId(state, "b", "Home")).toBe("a");
    expect(neighbourTabId(state, "b", "End")).toBe("c");
  });
});

describe("zoom", () => {
  it("starts every tab at the configured size, and a duplicate does not inherit the zoom", () => {
    expect(createTab("a", "pwsh", "/").zoomDelta).toBe(0);
    const zoomed = zoomTab(three(), "b", 1, 14);
    expect(duplicateTab(zoomed, "b", "d").tabs[3].zoomDelta).toBe(0);
  });

  it("zooms one tab by a point at a time and leaves the others alone", () => {
    let state = zoomTab(three(), "b", 1, 14);
    state = zoomTab(state, "b", 1, 14);
    expect(state.tabs.map((tab) => tab.zoomDelta)).toEqual([0, 2, 0]);
    expect(state.tabs.map((tab) => tabFontSize(14, tab))).toEqual([14, 16, 14]);
    state = zoomTab(state, "b", -1, 14);
    expect(state.tabs[1].zoomDelta).toBe(1);
  });

  it("returns to the configured size with 0", () => {
    const state = zoomTab(zoomTab(three(), "a", -1, 14), "a", 0, 14);
    expect(state.tabs[0].zoomDelta).toBe(0);
    const untouched = three();
    expect(zoomTab(untouched, "a", 0, 14).tabs[0]).toBe(untouched.tabs[0]);
  });

  it("stops at the largest and smallest size, so one press back always changes the text", () => {
    let state = three();
    for (let index = 0; index < 40; index += 1) state = zoomTab(state, "a", 1, 14);
    expect(tabFontSize(14, state.tabs[0])).toBe(32);
    state = zoomTab(state, "a", -1, 14);
    expect(tabFontSize(14, state.tabs[0])).toBe(31);

    state = three();
    for (let index = 0; index < 40; index += 1) state = zoomTab(state, "a", -1, 14);
    expect(tabFontSize(14, state.tabs[0])).toBe(8);
    expect(tabFontSize(14, zoomTab(state, "a", 1, 14).tabs[0])).toBe(9);
  });

  it("steps from the size shown when the configured size moved under a zoomed tab", () => {
    // Zoomed up by 10 at 14, then the saved size is raised to 30: the tab shows 32 (clamped), and one press down must shrink it.
    const zoomed = { ...three(), tabs: three().tabs.map((tab) => (tab.id === "a" ? { ...tab, zoomDelta: 10 } : tab)) };
    expect(tabFontSize(30, zoomed.tabs[0])).toBe(32);
    expect(tabFontSize(30, zoomTab(zoomed, "a", -1, 30).tabs[0])).toBe(31);
  });

  it("ignores a tab that does not exist", () => {
    expect(zoomTab(three(), "zzz", 1, 14).tabs.map((tab) => tab.zoomDelta)).toEqual([0, 0, 0]);
  });
});
