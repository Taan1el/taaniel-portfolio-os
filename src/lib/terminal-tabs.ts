import { getTerminalProfile, type ShellProfileId } from "@/lib/terminal-profiles";

/*
 * The terminal's tab strip as plain data. Every operation returns a new state,
 * so the app only has to keep one value and the rules can be tested alone.
 */

export interface TerminalTab {
  id: string;
  profileId: ShellProfileId;
  /** What the tab strip shows. A shell can rename it (cmd's `title`). */
  title: string;
  /** Virtual folder the shell starts in. */
  startPath: string;
}

export interface TabsState {
  tabs: TerminalTab[];
  activeId: string;
}

/** A script that runs `wt` in a loop cannot open tabs without end. */
export const MAX_TABS = 16;
export const MAX_TITLE_LENGTH = 60;

export function createTab(id: string, profileId: ShellProfileId, startPath: string): TerminalTab {
  return { id, profileId, title: getTerminalProfile(profileId).name, startPath };
}

export function createTabsState(first: TerminalTab): TabsState {
  return { tabs: [first], activeId: first.id };
}

export const canAddTab = (state: TabsState) => state.tabs.length < MAX_TABS;

/** Add a tab right after the active one (as Windows Terminal does) and switch to it. Full strips ignore the request. */
export function addTab(state: TabsState, tab: TerminalTab): TabsState {
  if (!canAddTab(state)) return state;
  const index = state.tabs.findIndex((entry) => entry.id === state.activeId);
  const tabs = [...state.tabs];
  tabs.splice(index + 1, 0, tab);
  return { tabs, activeId: tab.id };
}

/** The same shell in the same folder as an existing tab. */
export function duplicateTab(state: TabsState, id: string, newId: string, startPath?: string): TabsState {
  const source = state.tabs.find((tab) => tab.id === id);
  if (!source || !canAddTab(state)) return state;
  const copy: TerminalTab = { ...source, id: newId, startPath: startPath ?? source.startPath };
  const tabs = [...state.tabs];
  tabs.splice(state.tabs.indexOf(source) + 1, 0, copy);
  return { tabs, activeId: copy.id };
}

/** Close a tab. Null means that was the last one: the window closes with it. */
export function closeTab(state: TabsState, id: string): TabsState | null {
  const index = state.tabs.findIndex((tab) => tab.id === id);
  if (index < 0) return state;
  if (state.tabs.length === 1) return null;
  const tabs = state.tabs.filter((tab) => tab.id !== id);
  const activeId = id === state.activeId ? (tabs[index] ?? tabs[index - 1]).id : state.activeId;
  return { tabs, activeId };
}

export function closeOtherTabs(state: TabsState, id: string): TabsState {
  const keep = state.tabs.find((tab) => tab.id === id);
  return keep ? { tabs: [keep], activeId: keep.id } : state;
}

export function activateTab(state: TabsState, id: string): TabsState {
  return state.activeId !== id && state.tabs.some((tab) => tab.id === id) ? { ...state, activeId: id } : state;
}

/** Ctrl+Tab and Ctrl+Shift+Tab: next and previous, wrapping around. */
export function cycleTab(state: TabsState, step: 1 | -1): TabsState {
  if (state.tabs.length < 2) return state;
  const index = state.tabs.findIndex((tab) => tab.id === state.activeId);
  return { ...state, activeId: state.tabs[(index + step + state.tabs.length) % state.tabs.length].id };
}

/** Ctrl+Alt+1..9: the tab at a zero-based position. A position with no tab does nothing. */
export function gotoTab(state: TabsState, index: number): TabsState {
  const target = state.tabs[index];
  return target ? activateTab(state, target.id) : state;
}

/** Tab titles come from the shell, so control characters and length are cleaned. An empty title restores the default. */
export function sanitizeTitle(title: string): string {
  // eslint-disable-next-line no-control-regex
  return title.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LENGTH);
}

export function renameTab(state: TabsState, id: string, title: string): TabsState {
  const clean = sanitizeTitle(title);
  return {
    ...state,
    tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, title: clean || getTerminalProfile(tab.profileId).name } : tab)),
  };
}

/** Move the focus ring along the strip: the tab id to focus for an arrow, Home or End key. */
export function neighbourTabId(state: TabsState, fromId: string, key: "ArrowLeft" | "ArrowRight" | "Home" | "End"): string {
  const { tabs } = state;
  const index = Math.max(0, tabs.findIndex((tab) => tab.id === fromId));
  if (key === "Home") return tabs[0].id;
  if (key === "End") return tabs[tabs.length - 1].id;
  const step = key === "ArrowRight" ? 1 : -1;
  return tabs[(index + step + tabs.length) % tabs.length].id;
}
