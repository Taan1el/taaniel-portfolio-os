import { useEffect, useRef, useState } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { FolderOpen, RotateCcw } from "lucide-react";
import "@xterm/xterm/css/xterm.css";
import { AppContent, AppScaffold, AppToolbar, Button, StatusBar } from "@/components/apps/app-layout";
import { openFileSystemPath } from "@/lib/launchers";
import { executeTerminalCommand, TERMINAL_HOME_PATH } from "@/lib/terminal-shell";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps } from "@/types/system";

export function TerminalApp({ window }: AppComponentProps) {
  const initialPath = window.payload?.directoryPath ?? TERMINAL_HOME_PATH;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const currentPathRef = useRef(initialPath);
  const commandRef = useRef("");
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const nodes = useFileSystemStore((state) => state.nodes);
  const listDirectory = useFileSystemStore((state) => state.listDirectory);
  const readFile = useFileSystemStore((state) => state.readFile);
  const nodesRef = useRef(nodes);
  const launchApp = useSystemStore((state) => state.launchApp);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) {
      return;
    }

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: "IBM Plex Mono, monospace",
      fontSize: 13,
      theme: {
        background: "#071019",
        foreground: "#dbe6ff",
        cursor: "#ff8a5c",
        selectionBackground: "rgba(119, 199, 255, 0.25)",
      },
    });
    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();
    fitAddonRef.current = fitAddon;

    const getPrompt = () => `taaniel@portfolio:${currentPathRef.current} $ `;

    const printPrompt = () => {
      terminal.write(getPrompt());
    };

    const writeLines = (lines: string[]) => {
      lines.forEach((line) => terminal.writeln(line || ""));
    };

    const redrawInput = () => {
      terminal.write("\x1b[2K\r");
      terminal.write(getPrompt());
      terminal.write(commandRef.current);
    };

    const runCommand = (input: string) => {
      const result = executeTerminalCommand(input, {
        currentPath: currentPathRef.current,
        nodes: nodesRef.current,
        listDirectory,
        readFile,
      });

      if (result.clear) {
        terminal.clear();
      } else if (result.lines.length > 0) {
        writeLines(result.lines);
      }

      if (result.nextPath && result.nextPath !== currentPathRef.current) {
        currentPathRef.current = result.nextPath;
        setCurrentPath(result.nextPath);
      }

      result.actions?.forEach((action) => {
        if (action.type === "open-path") {
          openFileSystemPath(action.path, nodesRef.current, launchApp);
          return;
        }

        launchApp({
          appId: action.appId,
          payload: action.payload,
          title: action.title,
        });
      });
    };

    terminal.writeln("Taaniel OS Terminal");
    terminal.writeln("Use `help` for commands. This terminal explores the portfolio shell safely.");
    printPrompt();

    terminal.onData((data) => {
      switch (data) {
        case "\r":
          terminal.write("\r\n");

          if (commandRef.current.trim()) {
            commandHistoryRef.current.push(commandRef.current);
          }

          historyIndexRef.current = commandHistoryRef.current.length;
          runCommand(commandRef.current);
          commandRef.current = "";
          printPrompt();
          break;
        case "\u007F":
          if (commandRef.current.length > 0) {
            commandRef.current = commandRef.current.slice(0, -1);
            terminal.write("\b \b");
          }
          break;
        case "\u001b[A": {
          if (commandHistoryRef.current.length === 0) {
            break;
          }

          historyIndexRef.current = Math.max(0, historyIndexRef.current - 1);
          commandRef.current = commandHistoryRef.current[historyIndexRef.current] ?? "";
          redrawInput();
          break;
        }
        case "\u001b[B": {
          if (commandHistoryRef.current.length === 0) {
            break;
          }

          historyIndexRef.current = Math.min(
            commandHistoryRef.current.length,
            historyIndexRef.current + 1
          );
          commandRef.current =
            historyIndexRef.current >= commandHistoryRef.current.length
              ? ""
              : commandHistoryRef.current[historyIndexRef.current] ?? "";
          redrawInput();
          break;
        }
        default:
          if (data >= String.fromCharCode(0x20)) {
            commandRef.current += data;
            terminal.write(data);
          }
      }
    });

    const resizeObserver = new ResizeObserver(() => fitAddon.fit());
    resizeObserver.observe(containerRef.current);
    terminalRef.current = terminal;

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [launchApp, listDirectory, readFile]);

  return (
    <AppScaffold className="terminal-app">
      <AppToolbar className="terminal-app__toolbar">
        <div className="app-toolbar__title">
          <strong>Portfolio Terminal</strong>
          <small>Filesystem-safe commands with quick launch hooks into the OS.</small>
        </div>
        <div className="app-toolbar__group terminal-app__meta">
          <span className="games-hub__chip">{currentPath}</span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              terminalRef.current?.clear();
              terminalRef.current?.writeln("Screen cleared.");
              terminalRef.current?.write(`taaniel@portfolio:${currentPathRef.current} $ `);
            }}
          >
            <RotateCcw size={15} />
            Clear
          </Button>
          <Button
            type="button"
            variant="panel"
            onClick={() => openFileSystemPath(currentPathRef.current, nodesRef.current, launchApp)}
          >
            <FolderOpen size={15} />
            Open folder
          </Button>
        </div>
      </AppToolbar>

      <AppContent className="terminal-app__content" padded={false} scrollable={false} stacked={false}>
        <div className="terminal-app__viewport" ref={containerRef} />
      </AppContent>

      <StatusBar className="terminal-app__status">
        <span>Commands: help, ls, cd, pwd, cat, open, clear, whoami, about, projects, contact</span>
        <span>Up/Down recall history</span>
      </StatusBar>
    </AppScaffold>
  );
}
