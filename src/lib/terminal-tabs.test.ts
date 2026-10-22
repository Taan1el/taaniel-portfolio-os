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
