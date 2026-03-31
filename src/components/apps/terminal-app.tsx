import { useEffect, useRef } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { listChildren, normalizePath } from "@/lib/filesystem";
import { editFileSystemPath, openFileSystemPath } from "@/lib/launchers";
import { profile, skills, socialLinks, themePresets } from "@/data/portfolio";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps } from "@/types/system";

function resolvePath(input: string | undefined, currentPath: string) {
  if (!input || input === ".") {
    return currentPath;
  }

  if (input === "..") {
    const parent = currentPath.split("/").filter(Boolean).slice(0, -1).join("/");
    return parent ? `/${parent}` : "/";
  }

  if (input.startsWith("/")) {
    return normalizePath(input);
  }

  return normalizePath(`${currentPath}/${input}`);
}

export function TerminalApp({ window }: AppComponentProps) {
  void window;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const currentPathRef = useRef("/Desktop");
  const commandRef = useRef("");
  const nodes = useFileSystemStore((state) => state.nodes);
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

    const printPrompt = () => {
      terminal.write(`\r\n${currentPathRef.current} $ `);
    };

    const writeLines = (lines: string[]) => {
      lines.forEach((line) => terminal.writeln(line));
    };

    terminal.writeln("Taaniel OS Terminal");
    terminal.writeln("Type `help` to explore the portfolio.");
    printPrompt();

    const executeCommand = (input: string) => {
      const [command = "", ...args] = input.trim().split(/\s+/);
      const arg = args[0];

      switch (command) {
        case "":
          break;
        case "help":
          writeLines([
            "",
            "help         list commands",
            "ls [path]    list files",
            "cd [path]    change folder",
            "pwd          print current path",
            "cat <file>   print text file",
            "open <path>  open a file or folder",
            "edit <path>  open a file in its edit app",
            "whoami       recruiter summary",
            "skills       show stack",
            "socials      show links",
            "themes       list desktop themes",
            "clear        clear terminal",
          ]);
          break;
        case "clear":
          terminal.clear();
          break;
        case "pwd":
          terminal.writeln(currentPathRef.current);
          break;
        case "ls": {
          const path = resolvePath(arg, currentPathRef.current);
          const node = nodesRef.current[path];

          if (!node || node.kind !== "directory") {
            terminal.writeln(`Path not found: ${path}`);
            break;
          }

          const items = listChildren(nodesRef.current, path);
          writeLines(items.map((item) => `${item.kind === "directory" ? "dir " : "file"}  ${item.name}`));
          break;
        }
        case "cd": {
          const path = resolvePath(arg, currentPathRef.current);
          const node = nodesRef.current[path];

          if (!node || node.kind !== "directory") {
            terminal.writeln(`Directory not found: ${path}`);
            break;
          }

          currentPathRef.current = path;
          break;
        }
        case "cat": {
          const path = resolvePath(arg, currentPathRef.current);
          const node = nodesRef.current[path];

          if (!node || node.kind !== "file" || !node.content) {
            terminal.writeln(`Text file not found: ${path}`);
            break;
          }

          writeLines(node.content.split("\n"));
          break;
        }
        case "open": {
          const path = resolvePath(arg, currentPathRef.current);
          const node = nodesRef.current[path];

          if (!node) {
            terminal.writeln(`File not found: ${path}`);
            break;
          }

          openFileSystemPath(path, nodesRef.current, launchApp);
          terminal.writeln(`Opened ${path}`);
          break;
        }
        case "edit": {
          const path = resolvePath(arg, currentPathRef.current);
          const node = nodesRef.current[path];

          if (!node || node.kind !== "file") {
            terminal.writeln(`Editable file not found: ${path}`);
            break;
          }

          editFileSystemPath(path, nodesRef.current, launchApp);
          terminal.writeln(`Editing ${path}`);
          break;
        }
        case "whoami":
          writeLines([profile.name, profile.role, profile.intro]);
          break;
        case "skills":
          writeLines(skills.map((skill) => `- ${skill}`));
          break;
        case "socials":
          writeLines(socialLinks.map((link) => `${link.label}: ${link.url}`));
          break;
        case "themes":
          writeLines(themePresets.map((theme) => `${theme.name} (${theme.id})`));
          break;
        default:
          terminal.writeln(`Unknown command: ${command}`);
      }
    };

    terminal.onData((data) => {
      switch (data) {
        case "\r":
          terminal.write("\r\n");
          executeCommand(commandRef.current);
          commandRef.current = "";
          printPrompt();
          break;
        case "\u007F":
          if (commandRef.current.length > 0) {
            commandRef.current = commandRef.current.slice(0, -1);
            terminal.write("\b \b");
          }
          break;
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
    };
  }, [launchApp]);

  return <div className="terminal-app" ref={containerRef} />;
}
