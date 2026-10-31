import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ChevronDown, Cpu, Plus, Settings, SquareTerminal, Terminal as TerminalIcon, X } from "lucide-react";
import { AppContent, AppScaffold } from "@/components/apps/app-layout";
import { TerminalFindBar } from "@/components/apps/terminal/terminal-find-bar";
import { TerminalMenu, type TerminalMenuItem } from "@/components/apps/terminal/terminal-menu";
import { TerminalPasteDialog } from "@/components/apps/terminal/terminal-paste-dialog";
import { TerminalPane, type TabPasteRequest, type TerminalPaneEvents, type TerminalPaneHandle } from "@/components/apps/terminal/terminal-pane";
import { TerminalSettingsPanel } from "@/components/apps/terminal/terminal-settings-panel";
import { openFileSystemPath } from "@/lib/launchers";
import { buildAppearance, prefersReducedMotion, type TerminalAppearance } from "@/lib/terminal-appearance";
import { classifyTerminalKey, type TerminalCommand } from "@/lib/terminal-keys";
import { isShellProfileId, resolveLaunchProfile, terminalProfiles, type TerminalProfileId } from "@/lib/terminal-profiles";
import { getIsNetworkBlocked } from "@/stores/device-store";
import { LINUX_LAUNCH_MESSAGE, TERMINAL_HOME_PATH, type ShellFileSystem, type ShellHost, type TerminalAction } from "@/lib/terminal-shell";
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
  neighbourTabId,
  renameTab,
  tabFontSize,
  zoomTab,
  type TabsState,
  type TerminalTab,
} from "@/lib/terminal-tabs";
import { cn } from "@/lib/utils";
import "@/styles/win11-terminal.css";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useProcessStore } from "@/stores/process-store";
import { useSystemStore } from "@/stores/system-store";
import { useTerminalSettingsStore } from "@/stores/terminal-settings-store";
import { useWindowStore } from "@/stores/window-store";
import type { AppComponentProps, WindowPayload } from "@/types/system";

/*
 * The terminal app: Windows Terminal's tab strip, new-tab menu, find box and
 * settings around xterm screens (see ./terminal/). Single instance: a launch
 * while it is open arrives as a new tab, as the browser app does.
 */

const fileSystem: ShellFileSystem = {
  getNodes: () => useFileSystemStore.getState().nodes,
  mkdir: (path) => useFileSystemStore.getState().mkdir(path),
  writeFile: (path, content) => useFileSystemStore.getState().writeFile(path, content),
  rename: (path, nextName) => useFileSystemStore.getState().rename(path, nextName),
  deleteNode: (path) => useFileSystemStore.getState().deleteNode(path),
  pasteNode: (source, destination, operation) => useFileSystemStore.getState().pasteNode(source, destination, operation),
};

let tabSequence = 0;
const createTabId = () => `tab-${(tabSequence += 1)}`;

/** Keys the app handles itself wherever focus is; the rest belong to the screen that has focus. */
const APP_COMMANDS = new Set<TerminalCommand["type"]>([
  "new-tab",
  "new-tab-profile",
  "new-tab-menu",
  "close-tab",
  "duplicate-tab",
  "next-tab",
  "previous-tab",
  "goto-tab",
  "find",
  "settings",
  "zoom",
  "move-focus",
]);

function validDirectory(path: string | undefined) {
  return path !== undefined && fileSystem.getNodes()[path]?.kind === "directory" ? path : undefined;
}

function initialTabs(payload: WindowPayload | undefined): TabsState {
  const requested = resolveLaunchProfile(payload?.profile);
  const profileId = isShellProfileId(requested) ? requested : useTerminalSettingsStore.getState().defaultProfile;
  return createTabsState(createTab(createTabId(), profileId, validDirectory(payload?.directoryPath) ?? TERMINAL_HOME_PATH));
}

function useReducedMotionPreference() {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

function ProfileIcon({ id, size = 14 }: { id: TerminalProfileId; size?: number }) {
  if (id === "cmd") return <SquareTerminal size={size} aria-hidden="true" />;
  if (id === "linux") return <Cpu size={size} aria-hidden="true" />;
  return <TerminalIcon size={size} aria-hidden="true" />;
}

type MenuState =
  | { kind: "new-tab"; anchor: { x: number; y: number } }
  | { kind: "terminal"; anchor: { x: number; y: number } }
  | { kind: "tab"; anchor: { x: number; y: number }; tabId: string };

const anchorBelow = (element: Element | null) => {
  const rect = element?.getBoundingClientRect();
  return { x: rect?.left ?? 0, y: (rect?.bottom ?? 0) + 2 };
};

export function TerminalApp({ window: appWindow }: AppComponentProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const idPrefix = useId();
  const launchApp = useSystemStore((state) => state.launchApp);
  const closeWindow = useSystemStore((state) => state.closeWindow);
  const focusWindow = useSystemStore((state) => state.focusWindow);
  const windowId = appWindow.id;
  const processId = appWindow.processId;
  const payload = appWindow.payload;

  const [{ tabs, activeId }, setTabsState] = useState<TabsState>(() => initialTabs(payload));
  const tabsState = useMemo<TabsState>(() => ({ tabs, activeId }), [tabs, activeId]);
  const stateRef = useRef(tabsState);
  stateRef.current = tabsState;

  const [menu, setMenu] = useState<MenuState | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [findFocus, setFindFocus] = useState(0);
  const [searchResult, setSearchResult] = useState<{ index: number; count: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pasteRequest, setPasteRequest] = useState<TabPasteRequest | null>(null);
  /** The paste dialog is modal: while it is open the app's own shortcuts do nothing. */
  const pasteOpen = useRef(false);
  pasteOpen.current = pasteRequest !== null;
  const [notice, setNotice] = useState("");

  const settings = useTerminalSettingsStore();
  const reducedMotion = useReducedMotionPreference();
  // One object per real change, so the screens only restyle when a setting that affects them changes.
  const appearance = useMemo(
    () => buildAppearance(settings, reducedMotion),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.schemeId, settings.fontSize, settings.cursorShape, settings.cursorBlink, settings.screenReaderMode, settings.improveContrast, reducedMotion]
  );

  // Each tab's text size is the configured one moved by that tab's own zoom, so one appearance object per size:
  // a screen is restyled only when its size or the settings really change.
  const appearanceFor = useMemo(() => {
    const bySize = new Map<number, TerminalAppearance>();
    return (tab: TerminalTab) => {
      const size = tabFontSize(appearance.fontSize, tab);
      if (size === appearance.fontSize) return appearance;
      const known = bySize.get(size);
      if (known) return known;
      const created = { ...appearance, fontSize: size };
      bySize.set(size, created);
      return created;
    };
  }, [appearance]);

  const handles = useRef<Record<string, TerminalPaneHandle | null>>({});
  /** Where focus goes once the next render has put the right tab in front. */
  const focusTarget = useRef<"terminal" | "tab" | null>("terminal");
  /** Brings focus back to whatever opened a menu, the find box or the settings. */
  const restoreFocus = useRef<(() => void) | null>(null);
  const noticeTimer = useRef<number | undefined>(undefined);
  /** The last thing inside the app that had focus, for when the window is brought back to the front. */
  const lastFocus = useRef<HTMLElement | null>(null);

  const panelId = (id: string) => `${idPrefix}-panel-${id}`;
  const tabDomId = (id: string) => `${idPrefix}-tab-${id}`;
  const focusTerminal = useCallback(() => handles.current[stateRef.current.activeId]?.focus(), []);

  const announce = useCallback((message: string) => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 8000);
  }, []);
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const rememberOpener = useCallback(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    restoreFocus.current = () => (opener?.isConnected ? opener.focus() : focusTerminal());
  }, [focusTerminal]);

  // What the shell can reach beyond files: the desktop's real apps and the real clipboard.
  const host = useMemo<Omit<ShellHost, "signal">>(
    () => ({
      listProcesses: () => {
        const windows = useWindowStore.getState().windows;
        return useProcessStore.getState().processes.map((process) => {
          const owned = windows.find((entry) => entry.processId === process.id);
          return { id: process.id, name: process.appId, title: owned?.title ?? "", minimized: owned?.minimized ?? false };
        });
      },
      stopProcess: (id) => {
        useWindowStore
          .getState()
          .windows.filter((entry) => entry.processId === id)
          .forEach((entry) => closeWindow(entry.id));
      },
      readClipboard: () => navigator.clipboard.readText(),
      writeClipboard: (text) => navigator.clipboard.writeText(text),
      // The browser's own online state. The system tray's offline switch replaces this when it exists.
      isOffline: getIsNetworkBlocked,
    }),
    [closeWindow]
  );

  // ----------------------------------------------------------------------- tabs

  /** One Virtual x86 window is enough: asking again brings the open one to the front. */
  const openLinux = useCallback(
    (say = true) => {
      const processes = useProcessStore.getState().processes;
      const open = useWindowStore.getState().windows.find((entry) => processes.some((process) => process.id === entry.processId && process.appId === "v86"));
      if (open) focusWindow(open.id);
      else launchApp({ appId: "v86" });
      // The shell prints this itself when `wsl` was typed; a menu or jump list has nowhere else to say it.
      if (say) announce(LINUX_LAUNCH_MESSAGE.join(" "));
    },
    [announce, focusWindow, launchApp]
  );

  const openTab = useCallback(
    (profileId: TerminalProfileId, startPath?: string) => {
      if (profileId === "linux") {
        openLinux();
        return;
      }
      if (!canAddTab(stateRef.current)) {
        announce(`This terminal already has ${MAX_TABS} tabs. Close one to open another.`);
        return;
      }
      focusTarget.current = "terminal";
      setTabsState((state) => addTab(state, createTab(createTabId(), profileId, startPath ?? TERMINAL_HOME_PATH)));
    },
    [announce, openLinux]
  );

  const openDefaultTab = useCallback(() => openTab(useTerminalSettingsStore.getState().defaultProfile), [openTab]);

  const closeTabById = useCallback(
    (id: string, focus: "terminal" | "tab" | null = "terminal") => {
      const next = closeTab(stateRef.current, id);
      if (!next) {
        // Closing the last tab closes the window, as in Windows Terminal.
        closeWindow(windowId);
        return;
      }
      focusTarget.current = focus;
      delete handles.current[id];
      setTabsState(next);
    },
    [closeWindow, windowId]
  );

  const duplicateTabById = useCallback(
    (id: string) => {
      if (!canAddTab(stateRef.current)) {
        announce(`This terminal already has ${MAX_TABS} tabs. Close one to open another.`);
        return;
      }
      focusTarget.current = "terminal";
      const cwd = handles.current[id]?.getCwd();
      setTabsState((state) => duplicateTab(state, id, createTabId(), cwd));
    },
    [announce]
  );

  const showTab = useCallback((update: (state: TabsState) => TabsState, focus: "terminal" | "tab" = "terminal") => {
    focusTarget.current = focus;
    setTabsState(update);
  }, []);

  /** Click or Enter on a tab: bring it to the front and start typing in it. */
  const selectTab = useCallback(
    (id: string) => {
      // Already in front: no render will follow, so there is nothing to wait for.
      if (id === stateRef.current.activeId) focusTerminal();
      else showTab((state) => activateTab(state, id));
    },
    [focusTerminal, showTab]
  );

  // A launch request arrives as the window's payload: the one it was opened with, and later a changed one
  // (a jump list item, "Open in Terminal"). Each request is acted on once and then spent: the payload is
  // cleared, so a reload - which restores the payload - cannot act on it again (it would open another
  // Virtual x86 window each time), and asking for the same thing twice is a change both times.
  const launchSignature = `${payload?.profile ?? ""}|${payload?.directoryPath ?? ""}|${payload?.launchNonce ?? ""}`;
  const handledLaunch = useRef<string | null>(null);
  useEffect(() => {
    if (handledLaunch.current === launchSignature) return;
    const isFirst = handledLaunch.current === null;
    handledLaunch.current = launchSignature;
    if (launchSignature === "||") return;

    const requested = resolveLaunchProfile(payload?.profile);
    if (requested === "linux") openTab("linux");
    // The first request already made the first tab, in its profile and folder.
    else if (!isFirst) openTab(requested ?? useTerminalSettingsStore.getState().defaultProfile, validDirectory(payload?.directoryPath));
    useProcessStore.getState().updateProcess(processId, { launchPayload: {} });
    // The payload is read through the signature: only a real change in it opens a tab.
  }, [launchSignature]); // eslint-disable-line react-hooks/exhaustive-deps
  // Bringing the window to the front (Alt+], the taskbar) or restoring it from minimized would leave focus on the
  // taskbar or the window before it, and typing would go nowhere. Put it back where it was in here - the find box,
  // the settings - or in the terminal, unless focus is already somewhere inside the app.
  useEffect(() => {
    if (!appWindow.focused || appWindow.minimized) return;
    const root = rootRef.current;
    if (!root || root.contains(document.activeElement)) return;
    const remembered = lastFocus.current;
    // A screen is never "remembered": the active one is found again, as a hidden tab's screen cannot take focus.
    if (remembered?.isConnected && root.contains(remembered) && !remembered.closest(".terminal-pane")) {
      remembered.focus();
      if (document.activeElement === remembered) return;
    }
    focusTerminal();
  }, [appWindow.focused, appWindow.minimized, focusTerminal]);

  // After a render that changed the active tab, put focus where the person's action meant it to go.
  useEffect(() => {
    const target = focusTarget.current;
    document.getElementById(tabDomId(activeId))?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    if (!target) return;
    focusTarget.current = null;
    if (target === "terminal") handles.current[activeId]?.focus();
    else document.getElementById(tabDomId(activeId))?.focus();
    // tabDomId only depends on idPrefix, which never changes.
  }, [activeId, tabs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // A paste waiting for confirmation belongs to a tab: if that tab closes, there is nothing to paste into.
  useEffect(() => {
    if (pasteRequest && !tabs.some((tab) => tab.id === pasteRequest.tabId)) setPasteRequest(null);
  }, [pasteRequest, tabs]);

  // ----------------------------------------------------------------------- actions

  const handleAction = useCallback(
    (tabId: string, action: TerminalAction) => {
      if (action.type === "exit") {
        // A shell ending in a tab behind the front one must not pull focus away from what the person is doing.
        closeTabById(tabId, tabId === stateRef.current.activeId ? "terminal" : null);
      } else if (action.type === "open-path") {
        openFileSystemPath(action.path, fileSystem.getNodes(), launchApp);
      } else if (action.type === "open-tab") {
        // `wt`, `pwsh` and `cmd` start in the folder the shell that ran them is in.
        const from = action.directoryPath ?? handles.current[tabId]?.getCwd();
        openTab(action.profile ?? useTerminalSettingsStore.getState().defaultProfile, from);
      } else if (action.type === "set-title") {
        setTabsState((state) => renameTab(state, tabId, action.title));
      } else if (action.type === "launch-app") {
        // `wsl` and `bash` too: the emulator is opened once, and asking again brings it forward.
        if (action.appId === "v86" && !action.payload) openLinux(false);
        else launchApp({ appId: action.appId, payload: action.payload, title: action.title });
      }
      // set-colors and reset-colors are the screen's own business: the tab's session applies them.
    },
    [closeTabById, launchApp, openLinux, openTab]
  );

  const openMenu = useCallback(
    (next: MenuState) => {
      rememberOpener();
      setMenu(next);
    },
    [rememberOpener]
  );

  const closeMenu = useCallback((restore: boolean) => {
    setMenu(null);
    if (restore) restoreFocus.current?.();
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    restoreFocus.current?.();
  }, []);

  const openSettings = useCallback(() => {
    if (settingsOpen) {
      closeSettings();
      return;
    }
    rememberOpener();
    setSettingsOpen(true);
  }, [closeSettings, rememberOpener, settingsOpen]);

  const closeFind = useCallback(() => {
    setFindOpen(false);
    setSearchResult(null);
    handles.current[stateRef.current.activeId]?.clearSearch();
    focusTerminal();
  }, [focusTerminal]);

  /** F6: out of the terminal onto the tab strip, and back. xterm keeps Tab and Escape for the shell. */
  const moveFocus = useCallback(() => {
    const inTerminal = document.activeElement instanceof Element && document.activeElement.closest(".terminal-pane");
    if (inTerminal) document.getElementById(tabDomId(stateRef.current.activeId))?.focus();
    else focusTerminal();
    // tabDomId only depends on idPrefix, which never changes.
  }, [focusTerminal]); // eslint-disable-line react-hooks/exhaustive-deps

  const runCommand = useCallback(
    (command: TerminalCommand) => {
      if (pasteOpen.current) return;
      switch (command.type) {
        case "new-tab":
          openDefaultTab();
          break;
        case "new-tab-profile": {
          const profile = terminalProfiles[command.index];
          if (profile) openTab(profile.id);
          break;
        }
        case "new-tab-menu":
          openMenu({ kind: "new-tab", anchor: anchorBelow(document.getElementById(`${idPrefix}-new-tab-menu`)) });
          break;
        case "close-tab":
          closeTabById(stateRef.current.activeId);
          break;
        case "duplicate-tab":
          duplicateTabById(stateRef.current.activeId);
          break;
        case "next-tab":
          showTab((state) => cycleTab(state, 1));
          break;
        case "previous-tab":
          showTab((state) => cycleTab(state, -1));
          break;
        case "goto-tab":
          showTab((state) => gotoTab(state, command.index));
          break;
        case "find":
          // Asking again while the box is open brings focus back to it.
          if (!findOpen) rememberOpener();
          setFindOpen(true);
          setFindFocus((count) => count + 1);
          break;
        case "settings":
          openSettings();
          break;
        case "zoom":
          // This tab only, and not saved: the configured size changes in Settings, and Ctrl+0 returns to it.
          setTabsState((state) => zoomTab(state, state.activeId, command.delta, useTerminalSettingsStore.getState().fontSize));
          break;
        case "move-focus":
          moveFocus();
          break;
        default:
      }
    },
    // idPrefix never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [closeTabById, duplicateTabById, findOpen, moveFocus, openDefaultTab, openMenu, openSettings, openTab, rememberOpener, showTab]
  );

  // Keys pressed while focus is on the tab strip or a button rather than in a screen.
  const handleRootKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    // Under a modal dialog a tab switch or a new tab would happen behind it, with focus pulled out of it.
    if (event.defaultPrevented || pasteRequest) return;
    const decision = classifyTerminalKey(event.nativeEvent, { hasSelection: false });
    if (decision?.kind !== "command" || !APP_COMMANDS.has(decision.command.type)) return;
    event.preventDefault();
    event.stopPropagation();
    runCommand(decision.command);
  };

  const events = useMemo<TerminalPaneEvents>(
    () => ({
      onAction: handleAction,
      onCommand: runCommand,
      onOpenLink: (url) => launchApp({ appId: "browser", payload: { externalUrl: url } }),
      onPasteReview: setPasteRequest,
      onContextMenu: (point) => openMenu({ kind: "terminal", anchor: point }),
      onSearchResults: setSearchResult,
    }),
    [handleAction, launchApp, openMenu, runCommand]
  );

  const getBehaviour = useCallback(() => {
    const { copyOnSelect, multiLinePasteWarning } = useTerminalSettingsStore.getState();
    return { copyOnSelect, multiLinePasteWarning };
  }, []);

  // ------------------------------------------------------------------------ tab strip

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: TerminalTab) => {
    // Ctrl/Alt chords (Ctrl+Shift+Space, Ctrl+Alt+1...) belong to the terminal's shortcuts, not to the tab.
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowRight":
      case "Home":
      case "End": {
        event.preventDefault();
        const target = neighbourTabId(tabsState, tab.id, event.key);
        // Arrowing along the strip selects each tab but keeps focus on the strip.
        showTab((state) => activateTab(state, target), "tab");
        break;
      }
      case "Enter":
      case " ":
        event.preventDefault();
        selectTab(tab.id);
        break;
      case "Delete":
        event.preventDefault();
        closeTabById(tab.id, "tab");
        break;
      case "ContextMenu":
        event.preventDefault();
        openMenu({ kind: "tab", tabId: tab.id, anchor: anchorBelow(event.currentTarget) });
        break;
      default:
    }
  };

  const menuItems = (state: MenuState): TerminalMenuItem[] => {
    if (state.kind === "new-tab") {
      const profileItems = terminalProfiles.map<TerminalMenuItem>((profile, index) => ({
        id: profile.id,
        label: profile.name,
        shortcut: `Ctrl+Shift+${index + 1}`,
        icon: <ProfileIcon id={profile.id} />,
        onSelect: () => openTab(profile.id),
      }));
      return [
        ...profileItems,
        { id: "settings", label: "Settings", shortcut: "Ctrl+,", icon: <Settings size={14} aria-hidden="true" />, separatorBefore: true, onSelect: openSettings },
      ];
    }

    if (state.kind === "tab") {
      return [
        { id: "duplicate", label: "Duplicate tab", shortcut: "Ctrl+Shift+D", onSelect: () => duplicateTabById(state.tabId) },
        { id: "close", label: "Close tab", onSelect: () => closeTabById(state.tabId) },
        {
          id: "close-others",
          label: "Close other tabs",
          disabled: tabs.length < 2,
          onSelect: () => {
            focusTarget.current = "terminal";
            Object.keys(handles.current).forEach((id) => id !== state.tabId && delete handles.current[id]);
            setTabsState((current) => closeOtherTabs(current, state.tabId));
          },
        },
      ];
    }

    const handle = handles.current[activeId];
    return [
      { id: "copy", label: "Copy", shortcut: "Ctrl+Shift+C", disabled: !handle?.hasSelection(), onSelect: () => handle?.copySelection() },
      { id: "paste", label: "Paste", shortcut: "Ctrl+V", onSelect: () => void handle?.pasteFromClipboard() },
      { id: "select-all", label: "Select all", shortcut: "Ctrl+Shift+A", onSelect: () => handle?.selectAll() },
      { id: "find", label: "Find", shortcut: "Ctrl+Shift+F", separatorBefore: true, onSelect: () => runCommand({ type: "find" }) },
      { id: "settings", label: "Settings", shortcut: "Ctrl+,", onSelect: openSettings },
    ];
  };

  const menuLabel = (state: MenuState) =>
    state.kind === "new-tab" ? "New tab" : state.kind === "tab" ? "Tab actions" : "Terminal actions";

  return (
    <AppScaffold
      className="terminal-app w11-terminal"
      ref={rootRef}
      style={{ "--terminal-bg": appearance.theme.background, "--terminal-fg": appearance.theme.foreground } as CSSProperties}
      onKeyDown={handleRootKeyDown}
      onFocus={(event) => {
        lastFocus.current = event.target instanceof HTMLElement ? event.target : null;
      }}
    >
      <div className="w11-terminal__chrome">
        <div
          className="w11-terminal__tabs"
          role="tablist"
          aria-label="Terminal tabs"
          onDoubleClick={(event) => {
            if (event.target === event.currentTarget) openDefaultTab();
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeId;
            return (
              <div key={tab.id} role="presentation" className={cn("w11-terminal__tab", isActive && "is-active")}>
                <button
                  type="button"
                  role="tab"
                  id={tabDomId(tab.id)}
                  aria-selected={isActive}
                  aria-controls={panelId(tab.id)}
                  tabIndex={isActive ? 0 : -1}
                  className="w11-terminal__tab-button"
                  title={tab.title}
                  onClick={() => selectTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, tab)}
                  onAuxClick={(event) => {
                    // Middle-click closes a tab.
                    if (event.button === 1) closeTabById(tab.id);
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    openMenu({ kind: "tab", tabId: tab.id, anchor: { x: event.clientX, y: event.clientY } });
                  }}
                >
                  <span className="w11-terminal__tab-icon">
                    <ProfileIcon id={tab.profileId} />
                  </span>
                  <span className="w11-terminal__tab-title">{tab.title}</span>
                </button>
                <button
                  type="button"
                  className="w11-terminal__tab-close"
                  tabIndex={-1}
                  aria-label={`Close ${tab.title}`}
                  title="Close tab"
                  onClick={() => closeTabById(tab.id)}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>

        <button type="button" className="w11-terminal__icon-button" aria-label="New tab" title="New tab" onClick={openDefaultTab}>
          <Plus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          id={`${idPrefix}-new-tab-menu`}
          className="w11-terminal__icon-button"
          aria-label="New tab menu"
          aria-haspopup="menu"
          aria-expanded={menu?.kind === "new-tab"}
          title="New tab menu (Ctrl+Shift+Space)"
          onClick={(event) => openMenu({ kind: "new-tab", anchor: anchorBelow(event.currentTarget) })}
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="w11-terminal__icon-button"
          aria-label="Terminal settings"
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          title="Settings (Ctrl+,)"
          onClick={openSettings}
        >
          <Settings size={16} aria-hidden="true" />
        </button>
      </div>

      <AppContent className="terminal-app__content w11-terminal__body" padded={false} scrollable={false} stacked={false}>
        {tabs.map((tab) => (
          <TerminalPane
            key={tab.id}
            ref={(handle) => {
              if (handle) handles.current[tab.id] = handle;
            }}
            tabId={tab.id}
            panelId={panelId(tab.id)}
            tabDomId={tabDomId(tab.id)}
            profileId={tab.profileId}
            startPath={tab.startPath}
            active={tab.id === activeId}
            appearance={appearanceFor(tab)}
            ariaLabel={`${tab.title} terminal input`}
            fileSystem={fileSystem}
            host={host}
            getBehaviour={getBehaviour}
            events={events}
          />
        ))}

        {findOpen ? (
          <TerminalFindBar
            tabKey={activeId}
            focusRequest={findFocus}
            result={searchResult}
            onSearch={(term, direction, options, incremental) => handles.current[activeId]?.find(term, direction, options, incremental)}
            onClear={() => {
              handles.current[activeId]?.clearSearch();
              setSearchResult(null);
            }}
            onClose={closeFind}
          />
        ) : null}

        {settingsOpen ? <TerminalSettingsPanel reducedMotion={reducedMotion} onClose={closeSettings} /> : null}

        {/* Always in the page, so a screen reader is already watching it when a message arrives in it. */}
        <div role="status" className="w11-terminal__notice">
          {notice}
        </div>
      </AppContent>

      {menu ? (
        <TerminalMenu label={menuLabel(menu)} items={menuItems(menu)} anchor={menu.anchor} boundary={rootRef} onClose={closeMenu} />
      ) : null}

      {pasteRequest ? (
        <TerminalPasteDialog
          request={pasteRequest}
          onConfirm={() => {
            // Into the tab that asked, which may be gone by now.
            handles.current[pasteRequest.tabId]?.pasteText(pasteRequest.text);
            setPasteRequest(null);
          }}
          onCancel={() => {
            setPasteRequest(null);
            focusTerminal();
          }}
        />
      ) : null}
    </AppScaffold>
  );
}
