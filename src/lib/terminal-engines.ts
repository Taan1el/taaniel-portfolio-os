import type { ShellProfileId } from "@/lib/terminal-profiles";
import {
  completeCmdInput,
  formatCmdPrompt,
  getCmdBanner,
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
  type CompletionResult,
  type ShellFileSystem,
  type ShellHost,
  type ShellResult,
  type ShellSession,
} from "@/lib/terminal-shell";
import type { FileSystemRecord } from "@/types/system";

/**
 * What a terminal tab needs from the shell running in it. PowerShell and the
 * Command Prompt differ in all of it - prompt, colours, completion, whether
 * history is offered inline - so a tab only ever talks to one of these.
 */
export interface ShellEngine {
  id: ShellProfileId;
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
  prompt: (session) => formatCmdPrompt(session.cwd),
  banner: getCmdBanner,
  run: (input, session, fs, host) => runCmdCommand(input, session, fs, host),
  complete: completeCmdInput,
  highlight: highlightCmdInput,
  predict: () => "",
};

const ENGINES: Record<ShellProfileId, ShellEngine> = { pwsh: powershell, cmd: commandPrompt };

export function getShellEngine(id: ShellProfileId): ShellEngine {
  return ENGINES[id] ?? powershell;
}
