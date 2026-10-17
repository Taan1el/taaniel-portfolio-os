import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type Ref } from "react";
import "@xterm/xterm/css/xterm.css";
import {
  TerminalSession,
  type FindOptions,
  type PasteRequest,
  type TerminalSessionCallbacks,
} from "@/components/apps/terminal/terminal-session";
import type { TerminalAppearance } from "@/lib/terminal-appearance";
import { getShellEngine } from "@/lib/terminal-engines";
import type { TerminalCommand } from "@/lib/terminal-keys";
import type { ShellProfileId } from "@/lib/terminal-profiles";
import type { ShellFileSystem, ShellHost, TerminalAction } from "@/lib/terminal-shell";
import { cn } from "@/lib/utils";

/** What the app can ask of a tab's screen. */
export interface TerminalPaneHandle {
  focus: () => void;
  getCwd: () => string;
  find: (term: string, direction: 1 | -1, options: FindOptions, incremental?: boolean) => boolean;
  clearSearch: () => void;
  hasSelection: () => boolean;
  copySelection: () => boolean;
  selectAll: () => void;
  pasteFromClipboard: () => Promise<void>;
  pasteText: (text: string) => void;
  /** True while a command is running in the tab. */
  isBusy: () => boolean;
}

export interface TerminalPaneEvents {
  onAction: (tabId: string, action: TerminalAction) => void;
  onCommand: (command: TerminalCommand) => void;
  onOpenLink: (url: string) => void;
  onPasteReview: (request: PasteRequest) => void;
  onContextMenu: (point: { x: number; y: number }) => void;
  onSearchResults: (result: { index: number; count: number }) => void;
}

interface TerminalPaneProps {
  ref?: Ref<TerminalPaneHandle>;
  tabId: string;
  /** DOM ids, so the tab can say which panel it controls and the panel which tab labels it. */
  panelId: string;
  tabDomId: string;
  profileId: ShellProfileId;
  startPath: string;
  active: boolean;
  appearance: TerminalAppearance;
  ariaLabel: string;
  fileSystem: ShellFileSystem;
  host: Omit<ShellHost, "signal">;
  getBehaviour: () => { copyOnSelect: boolean; multiLinePasteWarning: boolean };
  events: TerminalPaneEvents;
}

/** One tab's terminal screen. It stays mounted while its tab is in the background, so its shell keeps running. */
export function TerminalPane(props: TerminalPaneProps) {
  const { ref, tabId, panelId, tabDomId, active, appearance } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<TerminalSession | null>(null);

  // The session is built once; its callbacks always read the newest props through this.
  const latest = useRef(props);
  useLayoutEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const current = () => latest.current;
    const initial = current();

    const callbacks: TerminalSessionCallbacks = {
      onAction: (action) => current().events.onAction(initial.tabId, action),
      onCommand: (command) => current().events.onCommand(command),
      onOpenLink: (url) => current().events.onOpenLink(url),
      onPasteReview: (request) => current().events.onPasteReview(request),
      onContextMenu: (point) => current().events.onContextMenu(point),
      onSearchResults: (result) => current().events.onSearchResults(result),
    };

    const session = new TerminalSession({
      engine: getShellEngine(initial.profileId),
      startPath: initial.startPath,
      fileSystem: initial.fileSystem,
      host: initial.host,
      appearance: initial.appearance,
      ariaLabel: initial.ariaLabel,
      getBehaviour: () => current().getBehaviour(),
      callbacks,
      coarsePointer: typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches,
    });
    session.open(container);
    sessionRef.current = session;

    return () => {
      sessionRef.current = null;
      session.dispose();
    };
  }, []);

  useEffect(() => {
    sessionRef.current?.setAppearance(appearance);
  }, [appearance]);

  useEffect(() => {
    sessionRef.current?.setLabel(props.ariaLabel);
  }, [props.ariaLabel]);

  useEffect(() => {
    if (active) sessionRef.current?.activate();
  }, [active]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => sessionRef.current?.focus(),
      getCwd: () => sessionRef.current?.getCwd() ?? latest.current.startPath,
      find: (term, direction, options, incremental) => sessionRef.current?.find(term, direction, options, incremental) ?? false,
      clearSearch: () => sessionRef.current?.clearSearch(),
      hasSelection: () => sessionRef.current?.hasSelection() ?? false,
      copySelection: () => sessionRef.current?.copySelection() ?? false,
      selectAll: () => sessionRef.current?.selectAll(),
      pasteFromClipboard: async () => sessionRef.current?.pasteFromClipboard(),
      pasteText: (text) => sessionRef.current?.pasteText(text),
      isBusy: () => sessionRef.current?.isBusy() ?? false,
    }),
    []
  );

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabDomId}
      data-tab-id={tabId}
      hidden={!active}
      className={cn("terminal-pane", active && "is-active")}
    >
      {/* The padding around the text takes the scheme's background, so light schemes do not sit in a dark frame. */}
      <div className="terminal-app__viewport terminal-pane__screen" ref={containerRef} style={{ background: appearance.theme.background }} />
    </div>
  );
}
