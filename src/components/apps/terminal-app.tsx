import { useEffect, useRef } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { AppContent, AppScaffold } from "@/components/apps/app-layout";
import { openFileSystemPath } from "@/lib/launchers";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import {
  completeShellInput,
  createShellSession,
  formatPrompt,
  POWERSHELL_VERSION,
  runShellCommand,
  TERMINAL_HOME_PATH,
  type ShellFileSystem,
  type TerminalAction,
} from "@/lib/terminal-shell";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps } from "@/types/system";

/** Shared by every terminal window, like PSReadLine's history file. */
const HISTORY_KEY = "taaniel-os-terminal-history";
const HISTORY_LIMIT = 200;

/** Windows Terminal's default "Campbell" colour scheme. */
const CAMPBELL = {
  background: "#0C0C0C",
  foreground: "#CCCCCC",
  cursor: "#FFFFFF",
  cursorAccent: "#0C0C0C",
  selectionBackground: "#FFFFFF40",
  black: "#0C0C0C",
  red: "#C50F1F",
  green: "#13A10E",
  yellow: "#C19C00",
  blue: "#0037DA",
  magenta: "#881798",
  cyan: "#3A96DD",
  white: "#CCCCCC",
  brightBlack: "#767676",
  brightRed: "#E74856",
  brightGreen: "#16C60C",
  brightYellow: "#F9F1A5",
  brightBlue: "#3B78FF",
  brightMagenta: "#B4009E",
  brightCyan: "#61D6D6",
  brightWhite: "#F2F2F2",
};

function loadHistory() {
  try {
    const parsed: unknown = JSON.parse(readLocalStorage(HISTORY_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string").slice(-HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

const fileSystem: ShellFileSystem = {
  getNodes: () => useFileSystemStore.getState().nodes,
  mkdir: (path) => useFileSystemStore.getState().mkdir(path),
  writeFile: (path, content) => useFileSystemStore.getState().writeFile(path, content),
  rename: (path, nextName) => useFileSystemStore.getState().rename(path, nextName),
  deleteNode: (path) => useFileSystemStore.getState().deleteNode(path),
  pasteNode: (source, destination, operation) => useFileSystemStore.getState().pasteNode(source, destination, operation),
};

const isWordChar = (char: string | undefined) => Boolean(char && /[\w.\-~$]/.test(char));

export function TerminalApp({ window }: AppComponentProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const launchApp = useSystemStore((state) => state.launchApp);
  const closeWindow = useSystemStore((state) => state.closeWindow);
  const windowId = window.id;
  const initialPath = window.payload?.directoryPath ?? TERMINAL_HOME_PATH;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontFamily: '"Cascadia Mono", "Cascadia Code", Consolas, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.15,
      scrollback: 5000,
      theme: CAMPBELL,
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(container);
    fit.fit();

    const startPath = fileSystem.getNodes()[initialPath]?.kind === "directory" ? initialPath : TERMINAL_HOME_PATH;
    const session = createShellSession(startPath);
    session.history = loadHistory();

    let disposed = false;
    let line = "";
    let cursor = 0;
    /** Cursor offset within the input as it is currently drawn - needed to find the input's first row. */
    let drawnCursor = 0;
    let historyIndex = session.history.length;
    let draft = "";
    let busy = false;
    let queued = "";

    const prompt = () => formatPrompt(session.cwd);

    /** Repaint prompt + input in place. Wrap-safe: climbs to the input's first row before redrawing. */
    const render = () => {
      const cols = terminal.cols;
      const promptWidth = prompt().length;
      const rowsUp = Math.floor((promptWidth + drawnCursor) / cols);
      let sequence = rowsUp > 0 ? `\x1b[${rowsUp}A` : "";
      sequence += `\r\x1b[J${prompt()}${line}`;

      const end = promptWidth + line.length;
      // Writing exactly to the last column leaves xterm in a pending-wrap state; step onto the next row.
      if (end > 0 && end % cols === 0) sequence += " \b";

      const target = promptWidth + cursor;
      const rowsBack = Math.floor(end / cols) - Math.floor(target / cols);
      if (rowsBack > 0) sequence += `\x1b[${rowsBack}A`;
      sequence += `\x1b[${(target % cols) + 1}G`;

      terminal.write(sequence);
      drawnCursor = cursor;
    };

    const newPrompt = () => {
      line = "";
      cursor = 0;
      drawnCursor = 0;
      terminal.write(prompt());
    };

    const writeLines = (lines: string[]) => {
      lines.forEach((entry) => terminal.write(`${entry.replace(/\r?\n/g, "\r\n")}\r\n`));
    };

    const handleAction = (action: TerminalAction) => {
      if (action.type === "exit") {
        closeWindow(windowId);
        return;
      }
      if (action.type === "open-path") {
        openFileSystemPath(action.path, fileSystem.getNodes(), launchApp);
        return;
      }
      launchApp({ appId: action.appId, payload: action.payload, title: action.title });
    };

    const finishLine = () => {
      cursor = line.length;
      render();
      terminal.write("\r\n");
    };

    const execute = async () => {
      const input = line;
      finishLine();
      historyIndex = session.history.length;
      draft = "";

      if (!input.trim()) {
        newPrompt();
        return;
      }

      busy = true;
      try {
        const result = await runShellCommand(input, session, fileSystem);
        if (disposed) return;
        if (result.clear) terminal.write("\x1b[2J\x1b[3J\x1b[H");
        writeLines(result.lines);
        result.actions.forEach(handleAction);
      } catch (error) {
        if (disposed) return;
        writeLines([`\x1b[91m${error instanceof Error ? error.message : String(error)}\x1b[0m`]);
      }

      // Recorded after running, so Get-History excludes the command that is executing.
      if (session.history.at(-1) !== input) session.history.push(input);
      session.history.splice(0, Math.max(0, session.history.length - HISTORY_LIMIT));
      writeLocalStorage(HISTORY_KEY, JSON.stringify(session.history));
      historyIndex = session.history.length;
      busy = false;
      if (disposed) return;

      newPrompt();
      if (queued) {
        const pending = queued;
        queued = "";
        handleData(pending);
      }
    };

    const complete = () => {
      const result = completeShellInput(line, cursor, session, fileSystem.getNodes());
      if (!result.candidates.length) {
        line = result.line;
        cursor = result.cursor;
        render();
        return;
      }

      const savedCursor = cursor;
      finishLine();
      const width = Math.max(...result.candidates.map((candidate) => candidate.length)) + 2;
      const perRow = Math.max(1, Math.floor(terminal.cols / width));
      for (let index = 0; index < result.candidates.length; index += perRow) {
        terminal.write(
          `${result.candidates
            .slice(index, index + perRow)
            .map((candidate) => candidate.padEnd(width))
            .join("")
            .trimEnd()}\r\n`
        );
      }
      cursor = savedCursor;
      drawnCursor = 0;
      render();
    };

    const insert = (text: string) => {
      line = `${line.slice(0, cursor)}${text}${line.slice(cursor)}`;
      cursor += text.length;
      render();
    };

    const wordLeft = () => {
      let index = cursor;
      while (index > 0 && !isWordChar(line[index - 1])) index -= 1;
      while (index > 0 && isWordChar(line[index - 1])) index -= 1;
      return index;
    };

    const wordRight = () => {
      let index = cursor;
      while (index < line.length && !isWordChar(line[index])) index += 1;
      while (index < line.length && isWordChar(line[index])) index += 1;
      return index;
    };

    const handleEscape = (sequence: string) => {
      switch (sequence) {
        case "\x1b[A":
          if (!session.history.length) return;
          if (historyIndex === session.history.length) draft = line;
          historyIndex = Math.max(0, historyIndex - 1);
          line = session.history[historyIndex] ?? "";
          cursor = line.length;
          render();
          return;
        case "\x1b[B":
          if (historyIndex >= session.history.length) return;
          historyIndex += 1;
          line = historyIndex === session.history.length ? draft : session.history[historyIndex] ?? "";
          cursor = line.length;
          render();
          return;
        case "\x1b[C":
          cursor = Math.min(line.length, cursor + 1);
          render();
          return;
        case "\x1b[D":
          cursor = Math.max(0, cursor - 1);
          render();
          return;
        case "\x1b[H":
        case "\x1bOH":
        case "\x1b[1~":
          cursor = 0;
          render();
          return;
        case "\x1b[F":
        case "\x1bOF":
        case "\x1b[4~":
          cursor = line.length;
          render();
          return;
        case "\x1b[3~":
          line = `${line.slice(0, cursor)}${line.slice(cursor + 1)}`;
          render();
          return;
        case "\x1b[1;5D":
          cursor = wordLeft();
          render();
          return;
        case "\x1b[1;5C":
          cursor = wordRight();
          render();
          return;
        case "\x1b[3;5~": {
          const end = wordRight();
          line = `${line.slice(0, cursor)}${line.slice(end)}`;
          render();
          return;
        }
        default:
      }
    };

    function handleData(data: string) {
      if (!started) return;
      if (busy) {
        queued += data;
        return;
      }

      if (data.length > 1 && data.startsWith("\x1b")) {
        handleEscape(data);
        return;
      }

      for (let index = 0; index < data.length; index += 1) {
        if (busy) {
          queued += data.slice(index);
          return;
        }

        const char = data[index];
        switch (char) {
          case "\r":
          case "\n":
            void execute();
            break;
          case "\x7f":
          case "\b":
            if (cursor > 0) {
              line = `${line.slice(0, cursor - 1)}${line.slice(cursor)}`;
              cursor -= 1;
              render();
            }
            break;
          case "\x17": {
            const start = wordLeft();
            line = `${line.slice(0, start)}${line.slice(cursor)}`;
            cursor = start;
            render();
            break;
          }
          case "\x03":
            finishLine();
            terminal.write("\x1b[91m^C\x1b[0m\r\n");
            historyIndex = session.history.length;
            newPrompt();
            break;
          case "\x0c":
            terminal.write("\x1b[2J\x1b[3J\x1b[H");
            drawnCursor = 0;
            render();
            break;
          case "\t":
            complete();
            break;
          case "\x1b":
            // Escape reverts the line, as in PSReadLine.
            line = "";
            cursor = 0;
            render();
            break;
          case "\x01":
            cursor = 0;
            render();
            break;
          case "\x05":
            cursor = line.length;
            render();
            break;
          default: {
            if (char < " ") break;
            // Insert a whole run of printable characters at once, so pastes redraw once.
            let end = index;
            while (end < data.length && data[end] >= " " && data[end] !== "\x7f") end += 1;
            insert(data.slice(index, end));
            index = end - 1;
          }
        }
      }
    }

    // Windows Terminal: Ctrl+C copies when text is selected; Ctrl+V pastes.
    terminal.attachCustomKeyEventHandler((event) => {
      if (event.type !== "keydown") return true;
      const ctrl = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (ctrl && key === "c" && terminal.hasSelection()) {
        void navigator.clipboard?.writeText(terminal.getSelection()).catch(() => undefined);
        terminal.clearSelection();
        return false;
      }
      // Returning false lets the browser fire a native paste, which xterm turns into onData.
      if (ctrl && key === "v") return false;
      return true;
    });

    const dataSubscription = terminal.onData(handleData);

    // A window that is still opening can report a sliver of width; text printed
    // then wraps one character per line. Print the banner once there is room.
    let started = false;
    const start = () => {
      if (started || terminal.cols < 20) return;
      started = true;
      terminal.writeln(`PowerShell ${POWERSHELL_VERSION}`);
      terminal.writeln("\x1b[90mType 'help' to see what this shell can do. Try: tree, ls, about, projects, notepad notes.txt\x1b[0m");
      terminal.writeln("");
      newPrompt();
      terminal.focus();
    };
    start();

    const resizeObserver = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        // The container can be zero-sized while a window animates in; the next resize fits it.
      }
      if (!started) start();
      else if (!busy) render();
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      dataSubscription.dispose();
      terminal.dispose();
    };
  }, [closeWindow, initialPath, launchApp, windowId]);

  return (
    <AppScaffold className="terminal-app">
      <AppContent className="terminal-app__content" padded={false} scrollable={false} stacked={false}>
        <div className="terminal-app__viewport" ref={containerRef} />
      </AppContent>
    </AppScaffold>
  );
}
