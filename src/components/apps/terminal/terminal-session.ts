import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal } from "@xterm/xterm";
import type { TerminalAppearance } from "@/lib/terminal-appearance";
import type { ShellEngine } from "@/lib/terminal-engines";
import { appendHistory, loadHistory } from "@/lib/terminal-history";
import { classifyTerminalKey, FOCUS_ESCAPE_HINT, type ScrollTarget, type TerminalCommand } from "@/lib/terminal-keys";
import {
  deleteBackward,
  deleteForward,
  deleteToEnd,
  deleteToStart,
  deleteWordBackward,
  deleteWordForward,
  historyNext,
  historyPrevious,
  historySearch,
  insertText,
  MAX_PASTE_LENGTH,
  moveTo,
  reviewPaste,
  sanitizePaste,
  startHistoryWalk,
  wordLeft,
  wordRight,
  type HistoryStep,
  type HistoryWalk,
  type LineState,
  type PasteReview,
} from "@/lib/terminal-line";
import { safeLinkTarget } from "@/lib/terminal-links";
import {
  createShellSession,
  sanitizeForTerminal,
  type ShellFileSystem,
  type ShellHost,
  type ShellSession,
  type TerminalAction,
} from "@/lib/terminal-shell";

/*
 * One terminal tab: an xterm screen, a shell session behind it, and the line
 * editing between them (what PSReadLine does - the shell itself only ever sees
 * finished lines). React owns the tabs around it; this class owns the screen.
 */

const FONT_FAMILY = '"Cascadia Mono", "Cascadia Code", Consolas, "Courier New", monospace';
const SCROLLBACK = 5000;
/** A window that is still opening can report a sliver of width; text printed then wraps one character per line. */
const MIN_COLUMNS = 20;
const CLEAR_SCREEN = "\x1b[2J\x1b[3J\x1b[H";
const ZOOM_WHEEL_INTERVAL_MS = 80;

export interface PasteRequest {
  text: string;
  review: PasteReview;
}

export interface TerminalSessionCallbacks {
  /** Something the shell asked the desktop to do: open an app or a tab, rename the tab, close it. */
  onAction: (action: TerminalAction) => void;
  /** A key command the screen does not run itself: tabs, find, settings, zoom, moving focus. */
  onCommand: (command: TerminalCommand) => void;
  /** A link in the output was followed. The address has already been checked. */
  onOpenLink: (url: string) => void;
  /** A paste the person should confirm first. Call pasteText to go ahead. */
  onPasteReview: (request: PasteRequest) => void;
  onContextMenu: (point: { x: number; y: number }) => void;
  onSearchResults: (result: { index: number; count: number }) => void;
}

export interface TerminalSessionOptions {
  engine: ShellEngine;
  startPath: string;
  fileSystem: ShellFileSystem;
  /** Everything but the abort signal, which each command gets its own of. */
  host: Omit<ShellHost, "signal">;
  appearance: TerminalAppearance;
  ariaLabel: string;
  /** Read when it matters, so a changed setting applies to the very next copy or paste. */
  getBehaviour: () => { copyOnSelect: boolean; multiLinePasteWarning: boolean };
  callbacks: TerminalSessionCallbacks;
  /** Touch screens have no Ctrl key to click links with. */
  coarsePointer?: boolean;
}

export interface FindOptions {
  caseSensitive: boolean;
  regex: boolean;
}

export class TerminalSession {
  readonly terminal: Terminal;
  readonly shell: ShellSession;

  private readonly options: TerminalSessionOptions;
  private readonly fitAddon = new FitAddon();
  private readonly searchAddon: SearchAddon;
  private container: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private cleanups: Array<() => void> = [];

  private state: LineState = { line: "", cursor: 0 };
  /** Cursor offset within the input as it is currently drawn: needed to find the input's first row. */
  private drawnCursor = 0;
  private walk: HistoryWalk;
  private busy = false;
  private queued = "";
  private abort: AbortController | null = null;
  private started = false;
  private disposed = false;
  private appearance: TerminalAppearance;
  private lastZoomWheel = 0;

  constructor(options: TerminalSessionOptions) {
    this.options = options;
    this.appearance = options.appearance;

    this.shell = createShellSession(options.startPath);
    this.shell.history = loadHistory(options.engine.historyKey);
    this.walk = startHistoryWalk(this.shell.history);

    this.terminal = new Terminal({
      // Search highlights are decorations, which xterm still keeps behind this flag.
      allowProposedApi: true,
      cursorBlink: options.appearance.cursorBlink,
      cursorStyle: options.appearance.cursorShape,
      fontFamily: FONT_FAMILY,
      fontSize: options.appearance.fontSize,
      lineHeight: 1.15,
      // OSC 8 hyperlinks (an escape sequence in the output) would otherwise open any address through xterm's own
      // confirm-and-window.open. They go through the same check and the in-OS browser as a plain URL does.
      linkHandler: {
        activate: (event, uri) => this.handleLink(event, uri),
        hover: () => this.showLinkHint(),
        leave: () => this.hideLinkHint(),
      },
      minimumContrastRatio: options.appearance.minimumContrastRatio,
      screenReaderMode: options.appearance.screenReaderMode,
      scrollback: SCROLLBACK,
      theme: options.appearance.theme,
    });
    this.searchAddon = new SearchAddon({ highlightLimit: 1000 });
  }

  // ------------------------------------------------------------------ mounting

  open(container: HTMLElement) {
    if (this.container) return;
    this.container = container;
    const { terminal } = this;

    terminal.loadAddon(this.fitAddon);
    terminal.loadAddon(this.searchAddon);
    terminal.loadAddon(
      new WebLinksAddon(this.handleLink, {
        hover: () => this.showLinkHint(),
        leave: () => this.hideLinkHint(),
      })
    );
    terminal.open(container);
    this.fitNow();
    this.applyLabel();

    terminal.attachCustomKeyEventHandler(this.handleKey);
    terminal.attachCustomWheelEventHandler(this.handleWheel);

    const data = terminal.onData(this.handleData);
    const results = this.searchAddon.onDidChangeResults(({ resultIndex, resultCount }) =>
      this.options.callbacks.onSearchResults({ index: resultIndex, count: resultCount })
    );
    this.cleanups.push(() => data.dispose(), () => results.dispose());

    // Every paste goes through here: it is cleaned, and may need confirming, before the shell sees it.
    this.listen(container, "paste", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.requestPaste((event as ClipboardEvent).clipboardData?.getData("text/plain") ?? "");
    }, true);
    this.listen(container, "contextmenu", (event) => {
      event.preventDefault();
      const mouse = event as MouseEvent;
      this.options.callbacks.onContextMenu({ x: mouse.clientX, y: mouse.clientY });
    });
    this.listen(container, "mouseup", () => {
      if (this.options.getBehaviour().copyOnSelect) this.copySelection();
    });

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.refit());
      this.resizeObserver.observe(container);
    }

    this.start();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.abort?.abort();
    this.resizeObserver?.disconnect();
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.terminal.dispose();
  }

  private listen(target: HTMLElement, type: string, handler: (event: Event) => void, capture = false) {
    target.addEventListener(type, handler, capture);
    this.cleanups.push(() => target.removeEventListener(type, handler, capture));
  }

  // -------------------------------------------------------------------- public

  focus() {
    if (!this.disposed) this.terminal.focus();
  }

  getCwd() {
    return this.shell.cwd;
  }

  /** True while a command is running (Ctrl+C interrupts it). */
  isBusy() {
    return this.busy;
  }

  setAppearance(next: TerminalAppearance) {
    if (this.disposed) return;
    const { terminal } = this;
    const previous = this.appearance;
    this.appearance = next;
    terminal.options.theme = next.theme;
    terminal.options.cursorStyle = next.cursorShape;
    terminal.options.cursorBlink = next.cursorBlink;
    terminal.options.screenReaderMode = next.screenReaderMode;
    terminal.options.minimumContrastRatio = next.minimumContrastRatio;
    if (next.fontSize !== previous.fontSize) {
      terminal.options.fontSize = next.fontSize;
      this.refit();
    }
    this.applyLabel();
  }

  setLabel(label: string) {
    this.options.ariaLabel = label;
    this.applyLabel();
  }

  /** The tab came to the front (or its window was resized while it was hidden): fit, and pick up history other tabs saved. */
  activate() {
    if (this.disposed) return;
    this.refit();
    if (!this.busy && this.started && !this.state.line) {
      this.shell.history.splice(0, this.shell.history.length, ...loadHistory(this.options.engine.historyKey));
      this.walk = startHistoryWalk(this.shell.history);
    }
  }

  find(term: string, direction: 1 | -1, options: FindOptions, incremental = false): boolean {
    if (this.disposed) return false;
    if (!term) {
      this.clearSearch();
      this.options.callbacks.onSearchResults({ index: -1, count: 0 });
      return false;
    }
    const { search } = this.appearance;
    const searchOptions = {
      caseSensitive: options.caseSensitive,
      regex: options.regex,
      incremental,
      decorations: {
        matchBackground: search.match,
        matchOverviewRuler: search.match,
        activeMatchBackground: search.active,
        activeMatchColorOverviewRuler: search.active,
      },
    };
    try {
      const found = direction === 1 ? this.searchAddon.findNext(term, searchOptions) : this.searchAddon.findPrevious(term, searchOptions);
      if (!found) this.options.callbacks.onSearchResults({ index: -1, count: 0 });
      return found;
    } catch {
      // An unfinished regular expression is not a match, and not an error to show.
      this.options.callbacks.onSearchResults({ index: -1, count: 0 });
      return false;
    }
  }

  clearSearch() {
    if (this.disposed) return;
    this.searchAddon.clearDecorations();
  }

  hasSelection() {
    return this.terminal.hasSelection();
  }

  copySelection(): boolean {
    const text = this.terminal.getSelection();
    if (!text) return false;
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    return true;
  }

  selectAll() {
    this.terminal.selectAll();
  }

  scroll(target: ScrollTarget) {
    const { terminal } = this;
    if (target === "line-up") terminal.scrollLines(-1);
    else if (target === "line-down") terminal.scrollLines(1);
    else if (target === "page-up") terminal.scrollPages(-1);
    else if (target === "page-down") terminal.scrollPages(1);
    else if (target === "top") terminal.scrollToTop();
    else terminal.scrollToBottom();
  }

  /** Paste from the system clipboard (the context menu's Paste). Browsers may ask permission first. */
  async pasteFromClipboard() {
    try {
      this.requestPaste((await navigator.clipboard.readText()) ?? "");
    } catch {
      // Permission refused or no clipboard API: Ctrl+V still works, because that is a real paste event.
    }
  }

  /** Paste text that has already been confirmed. */
  pasteText(text: string) {
    if (this.disposed) return;
    const clean = sanitizePaste(text);
    if (clean) this.terminal.paste(clean);
    this.terminal.focus();
  }

  // ------------------------------------------------------------------- layout

  private fitNow(): boolean {
    const container = this.container;
    // A hidden tab has no size to fit to; fitting it would squash the screen to a few columns.
    if (!container || container.clientWidth === 0 || container.clientHeight === 0) return false;
    try {
      this.fitAddon.fit();
    } catch {
      // The container can be zero-sized while a window animates in; the next resize fits it.
      return false;
    }
    return true;
  }

  private refit() {
    if (this.disposed || !this.fitNow()) return;
    if (!this.started) this.start();
    else if (!this.busy) this.render();
  }

  private applyLabel() {
    this.terminal.textarea?.setAttribute("aria-label", this.options.ariaLabel);
  }

  private start() {
    if (this.started || this.disposed || this.terminal.cols < MIN_COLUMNS) return;
    this.started = true;
    this.options.engine.banner().forEach((line) => this.terminal.writeln(line));
    this.terminal.writeln(`\x1b[90m${FOCUS_ESCAPE_HINT}\x1b[0m`);
    this.terminal.writeln("");
    this.newPrompt();
  }

  // ----------------------------------------------------------------- rendering

  private prompt() {
    return this.options.engine.prompt(this.shell);
  }

  /**
   * Repaint prompt + input in place, coloured like the shell colours it, with
   * the grey history prediction after the cursor. Wrap-safe: climbs to the
   * input's first row before redrawing.
   */
  private render(showPrediction = true) {
    if (this.disposed) return;
    const { engine } = this.options;
    const { line, cursor } = this.state;
    const cols = this.terminal.cols;
    const prompt = this.prompt();
    const promptWidth = prompt.length;
    const prediction = showPrediction && cursor === line.length ? engine.predict(line, this.shell.history) : "";
    const rowsUp = Math.floor((promptWidth + this.drawnCursor) / cols);
    let sequence = rowsUp > 0 ? `\x1b[${rowsUp}A` : "";
    sequence += `\r\x1b[J${prompt}${engine.highlight(line)}${prediction ? `\x1b[90m${prediction}\x1b[0m` : ""}`;

    const end = promptWidth + line.length + prediction.length;
    // Writing exactly to the last column leaves xterm in a pending-wrap state; step onto the next row.
    if (end > 0 && end % cols === 0) sequence += " \b";

    const target = promptWidth + cursor;
    const rowsBack = Math.floor(end / cols) - Math.floor(target / cols);
    if (rowsBack > 0) sequence += `\x1b[${rowsBack}A`;
    sequence += `\x1b[${(target % cols) + 1}G`;

    this.terminal.write(sequence);
    this.drawnCursor = cursor;
  }

  private newPrompt() {
    this.state = { line: "", cursor: 0 };
    this.drawnCursor = 0;
    this.terminal.write(this.prompt());
  }

  private writeLines(lines: string[]) {
    lines.forEach((entry) => this.terminal.write(`${entry.replace(/\r?\n/g, "\r\n")}\r\n`));
  }

  private finishLine() {
    this.state = moveTo(this.state, this.state.line.length);
    this.render(false);
    this.terminal.write("\r\n");
  }

  private edit(next: LineState, prediction = true) {
    this.state = next;
    this.render(prediction);
  }

  // ------------------------------------------------------------------ commands

  /** Right arrow or End at the end of the line takes the grey prediction, as in PSReadLine. */
  private acceptPrediction() {
    const { line, cursor } = this.state;
    const prediction = cursor === line.length ? this.options.engine.predict(line, this.shell.history) : "";
    if (!prediction) return false;
    this.edit({ line: `${line}${prediction}`, cursor: line.length + prediction.length });
    return true;
  }

  private async execute() {
    const input = this.state.line;
    this.finishLine();
    this.walk = startHistoryWalk(this.shell.history);

    if (!input.trim()) {
      this.newPrompt();
      return;
    }

    this.busy = true;
    const controller = new AbortController();
    this.abort = controller;
    let interrupted = false;
    const hadHistory = this.shell.history.length > 0;

    try {
      const host: ShellHost = { ...this.options.host, signal: controller.signal };
      const result = await this.options.engine.run(input, this.shell, this.options.fileSystem, host);
      if (this.disposed) return;
      if (result.interrupted) {
        interrupted = true;
      } else {
        if (result.clear) this.terminal.write(CLEAR_SCREEN);
        this.writeLines(result.lines);
        result.actions.forEach((action) => this.options.callbacks.onAction(action));
      }
    } catch (error) {
      if (this.disposed) return;
      this.writeLines([`\x1b[91m${sanitizeForTerminal(error instanceof Error ? error.message : String(error))}\x1b[0m`]);
    }

    this.abort = null;
    // Recorded after running, so Get-History excludes the command that is executing. It is added to what
    // is stored now (other tabs may have saved commands meanwhile), and this tab then takes up the result.
    // A command that emptied the list (Clear-History) starts the saved one over.
    const cleared = hadHistory && this.shell.history.length === 0;
    const saved = appendHistory(this.options.engine.historyKey, input, this.shell.history, cleared);
    this.shell.history.splice(0, this.shell.history.length, ...saved);
    this.walk = startHistoryWalk(this.shell.history);
    this.busy = false;
    if (this.disposed) return;

    if (interrupted) {
      this.queued = "";
      this.terminal.write("\x1b[91m^C\x1b[0m\r\n");
    }
    this.newPrompt();
    if (this.queued) {
      const pending = this.queued;
      this.queued = "";
      this.handleData(pending);
    }
  }

  private complete() {
    const { line, cursor } = this.state;
    const result = this.options.engine.complete(line, cursor, this.shell, this.options.fileSystem.getNodes());
    if (!result.candidates.length) {
      this.edit({ line: result.line, cursor: result.cursor });
      return;
    }

    this.finishLine();
    const width = Math.max(...result.candidates.map((candidate) => candidate.length)) + 2;
    const perRow = Math.max(1, Math.floor(this.terminal.cols / width));
    for (let index = 0; index < result.candidates.length; index += perRow) {
      this.terminal.write(
        `${result.candidates
          .slice(index, index + perRow)
          .map((candidate) => candidate.padEnd(width))
          .join("")
          .trimEnd()}\r\n`
      );
    }
    this.state = { line, cursor };
    this.drawnCursor = 0;
    this.render();
  }

  private showHistory(step: HistoryStep) {
    if (step.line === null) return;
    this.walk = step.walk;
    this.edit({ line: step.line, cursor: step.line.length });
  }

  private handleEscape(sequence: string) {
    const { history } = this.shell;
    const { line, cursor } = this.state;
    switch (sequence) {
      case "\x1b[A":
        this.showHistory(historyPrevious(history, this.walk, line));
        return;
      case "\x1b[B":
        this.showHistory(historyNext(history, this.walk));
        return;
      case "\x1b[19~": // F8
        this.showHistory(historySearch(history, this.walk, line, -1));
        return;
      case "\x1b[19;2~": // Shift+F8
        this.showHistory(historySearch(history, this.walk, line, 1));
        return;
      case "\x1b[C":
        if (this.acceptPrediction()) return;
        this.edit(moveTo(this.state, cursor + 1));
        return;
      case "\x1b[D":
        this.edit(moveTo(this.state, cursor - 1));
        return;
      case "\x1b[H":
      case "\x1bOH":
      case "\x1b[1~":
        this.edit(moveTo(this.state, 0));
        return;
      case "\x1b[F":
      case "\x1bOF":
      case "\x1b[4~":
        if (this.acceptPrediction()) return;
        this.edit(moveTo(this.state, line.length));
        return;
      case "\x1b[3~":
        this.edit(deleteForward(this.state));
        return;
      case "\x1b[1;5D":
        this.edit(moveTo(this.state, wordLeft(this.state)));
        return;
      case "\x1b[1;5C":
        this.edit(moveTo(this.state, wordRight(this.state)));
        return;
      case "\x1b[3;5~":
        this.edit(deleteWordForward(this.state));
        return;
      case "\x1b[1;5H": // Ctrl+Home
        this.edit(deleteToStart(this.state));
        return;
      case "\x1b[1;5F": // Ctrl+End
        this.edit(deleteToEnd(this.state));
        return;
      case "\x1b[5~": // Page Up scrolls the display, as in PSReadLine
        this.scroll("page-up");
        return;
      case "\x1b[6~":
        this.scroll("page-down");
        return;
      default:
    }
  }

  /** Keys typed or pasted while a command runs wait for the prompt, up to a limit. */
  private enqueue(text: string) {
    if (this.queued.length < MAX_PASTE_LENGTH) this.queued = `${this.queued}${text}`.slice(0, MAX_PASTE_LENGTH);
  }

  private readonly handleData = (data: string) => {
    if (!this.started || this.disposed) return;

    if (this.busy) {
      // Ctrl+C stops what is running; anything else typed meanwhile waits for the prompt.
      if (data.includes("\x03")) {
        this.queued = "";
        this.abort?.abort();
        return;
      }
      this.enqueue(data);
      return;
    }

    if (data.length > 1 && data.startsWith("\x1b")) {
      this.handleEscape(data);
      return;
    }

    for (let index = 0; index < data.length; index += 1) {
      if (this.busy) {
        this.enqueue(data.slice(index));
        return;
      }

      const char = data[index];
      switch (char) {
        case "\r":
        case "\n":
          void this.execute();
          break;
        case "\x7f":
          this.edit(deleteBackward(this.state));
          break;
        case "\b": // Ctrl+Backspace
        case "\x17": // Ctrl+W
          this.edit(deleteWordBackward(this.state));
          break;
        case "\x03":
          this.finishLine();
          this.terminal.write("\x1b[91m^C\x1b[0m\r\n");
          this.walk = startHistoryWalk(this.shell.history);
          this.newPrompt();
          break;
        case "\x0c":
          this.terminal.write(CLEAR_SCREEN);
          this.drawnCursor = 0;
          this.render();
          break;
        case "\t":
          this.complete();
          break;
        case "\x1b":
          // Escape reverts the line, as in PSReadLine.
          this.edit({ line: "", cursor: 0 });
          break;
        case "\x01":
          this.edit(moveTo(this.state, 0));
          break;
        case "\x05":
          this.edit(moveTo(this.state, this.state.line.length));
          break;
        default: {
          if (char < " ") break;
          // Insert a whole run of printable characters at once, so pastes redraw once.
          let end = index;
          while (end < data.length && data[end] >= " " && data[end] !== "\x7f") end += 1;
          this.edit(insertText(this.state, data.slice(index, end)));
          index = end - 1;
        }
      }
    }
  };

  // ---------------------------------------------------------------- key events

  private readonly handleKey = (event: KeyboardEvent): boolean => {
    if (event.type === "keyup") return true;
    const decision = classifyTerminalKey(event, { hasSelection: this.terminal.hasSelection() });
    if (!decision) return true;
    // Returning false makes xterm ignore the key; the event still reaches the page, so desktop shortcuts work.
    if (decision.kind === "bubble") return false;
    if (event.type === "keydown") this.runCommand(decision.command, event);
    return false;
  };

  private runCommand(command: TerminalCommand, event: KeyboardEvent) {
    // A paste key is left to the browser: it fires a paste event, which requestPaste reads.
    if (command.type === "native-paste") return;

    event.preventDefault();
    event.stopPropagation();
    if (command.type === "copy") {
      if (this.copySelection()) this.terminal.clearSelection();
    } else if (command.type === "select-all") {
      this.selectAll();
    } else if (command.type === "scroll") {
      this.scroll(command.target);
    } else {
      this.options.callbacks.onCommand(command);
    }
  }

  private readonly handleWheel = (event: WheelEvent): boolean => {
    if (!event.ctrlKey) return true;
    // Ctrl+scroll zooms the text, as in Windows Terminal, instead of zooming the whole page.
    event.preventDefault();
    const now = Date.now();
    if (now - this.lastZoomWheel >= ZOOM_WHEEL_INTERVAL_MS) {
      this.lastZoomWheel = now;
      this.options.callbacks.onCommand({ type: "zoom", delta: event.deltaY < 0 ? 1 : -1 });
    }
    return false;
  };

  private readonly handleLink = (event: MouseEvent, uri: string) => {
    if (!this.options.coarsePointer && !event.ctrlKey && !event.metaKey) return;
    const target = safeLinkTarget(uri);
    if (target) this.options.callbacks.onOpenLink(target);
  };

  private showLinkHint() {
    if (this.container) this.container.title = this.options.coarsePointer ? "" : "Ctrl+Click to follow link";
  }

  private hideLinkHint() {
    this.container?.removeAttribute("title");
  }

  private requestPaste(raw: string) {
    const text = sanitizePaste(raw);
    if (!text) return;
    const review = reviewPaste(text);
    if (review.reason && this.options.getBehaviour().multiLinePasteWarning) {
      this.options.callbacks.onPasteReview({ text, review });
      return;
    }
    this.pasteText(text);
  }
}
