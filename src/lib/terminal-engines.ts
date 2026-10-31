import type { ShellProfileId } from "@/lib/terminal-profiles";
import {
  completeCmdInput,
  getCmdBanner,
  getCmdPrompt,
  highlightCmdInput,
  runCmdCommand,
} from "@/lib/terminal-cmd";
import {
  completeShellInput,
  formatPrompt,
  getPowerShellBanner,
  highlightShellInput,
  predictFromHistory,
  runShellCommand,
  sanitizeForTerminal,
  type CompletionResult,
  type ShellFileSystem,
  type ShellHost,
  type ShellResult,
  type ShellSession,
} from "@/lib/terminal-shell";
import { PythonInterrupted, sendToPython } from "@/lib/python-runtime";
import type { FileSystemRecord } from "@/types/system";

/**
 * What a terminal tab needs from the shell running in it. PowerShell and the
 * Command Prompt differ in all of it - prompt, colours, completion, whether
 * history is offered inline - so a tab only ever talks to one of these.
 */
export interface ShellEngine {
  id: ShellProfileId | "python";
  /** The tab's title until the shell renames it. */
  title: string;
  /** localStorage key of this shell's command history (PSReadLine has its own, cmd does not share it). */
  historyKey: string;
  prompt: (session: ShellSession) => string;
  banner: () => string[];
  run: (input: string, session: ShellSession, fs: ShellFileSystem, host: ShellHost) => Promise<ShellResult>;
  complete: (line: string, cursor: number, session: ShellSession, nodes: FileSystemRecord) => CompletionResult;
  /** Adds colour escapes only: the visible text must not change, or the cursor maths drifts. */
  highlight: (line: string) => string;
  /** Grey text after the cursor that the right arrow accepts. Empty when the shell has none. */
  predict: (line: string, history: string[]) => string;
  /** True when an empty line should reach the shell instead of just showing a new prompt. */
  wantsEmptyLine?: (session: ShellSession) => boolean;
  /** Ctrl+C at the prompt: forget any half-typed block. */
  cancelInput?: (session: ShellSession) => void;
}

const powershell: ShellEngine = {
  id: "pwsh",
  title: "PowerShell",
  historyKey: "taaniel-os-terminal-history",
  prompt: (session) => formatPrompt(session.cwd),
  banner: getPowerShellBanner,
  run: (input, session, fs, host) => runShellCommand(input, session, fs, host),
  complete: (line, cursor, session, nodes) => completeShellInput(line, cursor, session, nodes),
  highlight: highlightShellInput,
  predict: predictFromHistory,
};

const commandPrompt: ShellEngine = {
  id: "cmd",
  title: "Command Prompt",
  historyKey: "taaniel-os-terminal-history-cmd",
  prompt: getCmdPrompt,
  banner: getCmdBanner,
  run: (input, session, fs, host) => runCmdCommand(input, session, fs, host),
  complete: completeCmdInput,
  highlight: highlightCmdInput,
  predict: () => "",
};

/** The REPL's state belongs to the shell it runs in, so two tabs can sit at different prompts. */
const waitingForMore = new WeakSet<ShellSession>();

const python: ShellEngine = {
  id: "python",
  title: "Python",
  historyKey: "taaniel-os-terminal-history-python",
  prompt: (session) => (waitingForMore.has(session) ? "... " : ">>> "),
  banner: () => ["Python on Taaniel OS (Pyodide). The first line loads about 14 MB; exit() leaves."],
  run: async (input, session, _fs, host) => {
    const done = (lines: string[], extra: Partial<ShellResult> = {}): ShellResult => ({ lines, clear: false, actions: [], success: true, ...extra });
    try {
      const result = await sendToPython({ type: "push", line: input }, host.signal);
      if (result.more) waitingForMore.add(session);
      else waitingForMore.delete(session);
      const text = sanitizeForTerminal(`${result.output}${result.error ?? ""}`).replace(/\n$/, "");
      return done(text ? text.split("\n") : [], result.exit ? { actions: [{ type: "exit" }] } : {});
    } catch (error) {
      waitingForMore.delete(session);
      if (error instanceof PythonInterrupted) return done(["\x1b[91mKeyboardInterrupt\x1b[0m (Python restarted, so its variables are gone)"]);
      return done([error instanceof Error ? error.message : "Python could not start."], { success: false });
    }
  },
  complete: (line, cursor) => ({ line, cursor, candidates: [] }),
  highlight: (line) => line,
  predict: () => "",
  wantsEmptyLine: (session) => waitingForMore.has(session),
  cancelInput: (session) => {
    if (!waitingForMore.delete(session)) return;
    void sendToPython({ type: "reset" }).catch(() => undefined);
  },
};

const ENGINES: Record<ShellProfileId | "python", ShellEngine> = { pwsh: powershell, cmd: commandPrompt, python };

export function getShellEngine(id: ShellProfileId | "python"): ShellEngine {
  return ENGINES[id] ?? powershell;
}
