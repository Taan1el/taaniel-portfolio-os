import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getTabLabel } from "@/components/apps/explorer/explorer-tabs";
import { TRASH_PATH } from "@/lib/system-workspace";
import { SHELL_USER } from "@/lib/windows-path";
import { useExplorerStore } from "@/stores/explorer-store";

const store = () => useExplorerStore.getState();
const session = () => store().sessions.w;
const paths = () => session().tabs.map((tab) => (tab.id === session().activeTabId ? session().currentPath : tab.currentPath));

beforeEach(() => store().ensureSession("w", "/Portfolio"));
afterEach(() => useExplorerStore.setState({ sessions: {} }));

describe("explorer tabs", () => {
  it("starts with one tab", () => {
    expect(session().tabs).toHaveLength(1);
    expect(session().activeTabId).toBe(session().tabs[0].id);
  });

  it("opens a tab on the same folder and shows it", () => {
    const first = session().activeTabId;
    store().openTab("w");

    expect(session().activeTabId).not.toBe(first);
    expect(paths()).toEqual(["/Portfolio", "/Portfolio"]);
  });

  it("opens a tab on a given folder, beside the active one", () => {
    const first = session().activeTabId;
    store().openTab("w", "/Media");
    store().switchTab("w", first);
    store().openTab("w", "/Code");

    expect(paths()).toEqual(["/Portfolio", "/Code", "/Media"]);
  });

  it("gives each tab its own history", () => {
    const first = session().activeTabId;
    store().navigate("w", "/Documents");
    store().openTab("w", "/Media");
    store().navigate("w", "/Media/Photography");
    const second = session().activeTabId;

    store().switchTab("w", first);
    expect(session().currentPath).toBe("/Documents");
    store().goBack("w");
    expect(session().currentPath).toBe("/Portfolio");

    store().switchTab("w", second);
    expect(session().currentPath).toBe("/Media/Photography");
    store().goBack("w");
    expect(session().currentPath).toBe("/Media");
    store().goBack("w");
    expect(session().currentPath).toBe("/Media");
  });

  it("gives each tab its own view and search", () => {
    const first = session().activeTabId;
    store().setViewMode("w", "list");
    store().setSearchQuery("w", "cv");
    store().openTab("w");

    expect(session().viewMode).toBe("list");
    expect(session().searchQuery).toBe("");
    store().setViewMode("w", "grid");

    store().switchTab("w", first);
    expect(session().viewMode).toBe("list");
    expect(session().searchQuery).toBe("cv");
  });

  it("clears the selection on a switch", () => {
    const first = session().activeTabId;
    store().setSelectedPaths("w", ["/Portfolio/About.md"]);
    store().beginRename("w", "/Portfolio/About.md");
    store().openTab("w");

    expect(session().selectedPaths).toEqual([]);
    expect(session().renamingPath).toBeNull();
    store().switchTab("w", first);
    expect(session().selectedPaths).toEqual([]);
  });

  it("closes the active tab and shows its neighbour", () => {
    store().openTab("w", "/Media");
    store().openTab("w", "/Code");
    const middle = session().tabs[1].id;

    store().switchTab("w", middle);
    store().closeTab("w", middle);

    expect(paths()).toEqual(["/Portfolio", "/Code"]);
    expect(session().currentPath).toBe("/Code");
  });

  it("falls back to the tab before when the last one closes", () => {
    store().navigate("w", "/Documents");
    store().openTab("w", "/Media");
    store().closeTab("w", session().activeTabId);

    expect(session().currentPath).toBe("/Documents");
  });

  it("closes a background tab without moving", () => {
    const first = session().activeTabId;
    store().openTab("w", "/Media");
    store().closeTab("w", first);

    expect(paths()).toEqual(["/Media"]);
    expect(session().currentPath).toBe("/Media");
  });

  it("keeps the last tab", () => {
    store().closeTab("w", session().activeTabId);

    expect(session().tabs).toHaveLength(1);
  });

  it("ignores a tab that does not exist", () => {
    const before = session();
    store().switchTab("w", "nope");
    store().closeTab("w", "nope");

    expect(session()).toBe(before);
  });

  it("names tabs after their folders", () => {
    expect(getTabLabel("/")).toBe(SHELL_USER);
    expect(getTabLabel(TRASH_PATH)).toBe("Recycle Bin");
    expect(getTabLabel("/Media/Photography")).toBe("Photography");
  });
});
