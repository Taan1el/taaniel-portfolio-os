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
    expect(session.selectedPaths).toEqual([]);
  });

  it("supports multi-select via toggle and extendSelection", () => {
    const store = useExplorerStore.getState();
    store.ensureSession("window-3", "/Desktop");
    const order = ["/Desktop/a", "/Desktop/b", "/Desktop/c", "/Desktop/d"];

    store.setSelectedPath("window-3", "/Desktop/a");
    store.toggleSelected("window-3", "/Desktop/c");
    let session = useExplorerStore.getState().sessions["window-3"];
    expect(session.selectedPaths).toEqual(["/Desktop/a", "/Desktop/c"]);
    expect(session.selectedPath).toBe("/Desktop/c");

    // shift-click from anchor /Desktop/c to /Desktop/a → reverse range
    store.extendSelection("window-3", "/Desktop/a", order);
    session = useExplorerStore.getState().sessions["window-3"];
    expect(session.selectedPaths).toEqual(["/Desktop/a", "/Desktop/b", "/Desktop/c"]);

    // toggling an existing entry removes it
    store.toggleSelected("window-3", "/Desktop/b");
    session = useExplorerStore.getState().sessions["window-3"];
    expect(session.selectedPaths).toEqual(["/Desktop/a", "/Desktop/c"]);
  });

  it("tracks inline rename mode", () => {
    const store = useExplorerStore.getState();
    store.ensureSession("window-4", "/Documents");
    store.beginRename("window-4", "/Documents/My Note.txt");
    let session = useExplorerStore.getState().sessions["window-4"];
    expect(session.renamingPath).toBe("/Documents/My Note.txt");
    expect(session.selectedPaths).toEqual(["/Documents/My Note.txt"]);

    store.endRename("window-4");
    session = useExplorerStore.getState().sessions["window-4"];
    expect(session.renamingPath).toBeNull();
  });

  it("stores sort preferences per session", () => {
    const store = useExplorerStore.getState();
    store.ensureSession("window-5", "/Desktop");
    store.setSort("window-5", "date", "desc");
    const session = useExplorerStore.getState().sessions["window-5"];
    expect(session.sortKey).toBe("date");
    expect(session.sortDirection).toBe("desc");
  });
});
