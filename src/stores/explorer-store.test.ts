import { afterEach, describe, expect, it } from "vitest";
import { useExplorerStore } from "@/stores/explorer-store";

afterEach(() => {
  useExplorerStore.setState({ sessions: {} });
});

describe("explorer-store", () => {
  it("tracks per-window navigation history in Zustand", () => {
    const store = useExplorerStore.getState();

    store.ensureSession("window-1", "/Portfolio");
    store.navigate("window-1", "/Media");
    store.navigate("window-1", "/Media/Photography");

    let session = useExplorerStore.getState().sessions["window-1"];
    expect(session.currentPath).toBe("/Media/Photography");
    expect(session.history).toEqual(["/Portfolio", "/Media", "/Media/Photography"]);
    expect(session.historyIndex).toBe(2);

    useExplorerStore.getState().goBack("window-1");
    session = useExplorerStore.getState().sessions["window-1"];
    expect(session.currentPath).toBe("/Media");
    expect(session.historyIndex).toBe(1);

    useExplorerStore.getState().goForward("window-1");
    session = useExplorerStore.getState().sessions["window-1"];
    expect(session.currentPath).toBe("/Media/Photography");
    expect(session.historyIndex).toBe(2);
  });

  it("clears selection and search when navigating", () => {
    const store = useExplorerStore.getState();

    store.ensureSession("window-2", "/Documents");
    store.setSearchQuery("window-2", "note");
    store.setSelectedPath("window-2", "/Documents/Notes/To-do list.txt");
    store.navigate("window-2", "/Documents/Notes");

    const session = useExplorerStore.getState().sessions["window-2"];
    expect(session.currentPath).toBe("/Documents/Notes");
    expect(session.searchQuery).toBe("");
    expect(session.selectedPath).toBeNull();
  });
});
