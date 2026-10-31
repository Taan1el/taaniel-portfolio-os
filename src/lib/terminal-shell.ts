import { featuredProjects, profile, socialLinks } from "@/data/portfolio";
import { getChangeRefusal, getParentPath, getPathName, normalizePath } from "@/lib/filesystem";
import {
  applyArithmetic,
  compareOperands,
  evaluateNode,
  ExpressionError,
  interpolateString,
  isBareItemNode,
  parseExpression,
  parseSizeLiteral,
  propertyToShellValue,
  toBool,
  toText,
  unescapeBacktick,
  wildcardRegex,
  type ExprNode,
  type ExpressionEnv,
  type ShellValue,
} from "@/lib/terminal-expression";
import type { SettingsSectionId } from "@/lib/settings-sections";
import { TRASH_PATH } from "@/lib/system-workspace";
import {
  ABOUT_TOPICS,
  findAboutTopic,
  HELP_EXAMPLES,
  READLINE_KEY_HANDLERS,
  syntaxParameters,
  type AboutTopic,
} from "@/lib/terminal-help";
import { DEFAULT_JSON_DEPTH, itemsToJson, jsonToItems, MAX_JSON_DEPTH } from "@/lib/terminal-json";
import { isAbsolutePath, joinPath, splitPath, type SplitPart } from "@/lib/terminal-paths";
import { resolveLaunchProfile, type ShellProfileId } from "@/lib/terminal-profiles";
import {
  compareValues as compareProperties,
  createObject,
  formatGenericView,
  formatListView,
  formatPropertyValue,
  formatTableView,
  getProperty,
  isShellDate,
  isShellObject,
  itemText,
  MAX_PIPELINE_ITEMS,
  selectProperties,
  splitPropertyList,
  type PipelineItem,
  type PropertyValue,
  type ShellObject,
} from "@/lib/terminal-objects";
import {
  childrenOf,
  findChild,
  PROFILE_ROOT,
  resolveShellPath,
  SHELL_HOST,
  SHELL_USER,
  toWindowsPath,
} from "@/lib/windows-path";
import type { AppId, FileSystemRecord, VirtualNode, WindowPayload } from "@/types/system";

/*
 * A small PowerShell 7 lookalike over the portfolio's virtual filesystem.
 *
 * The virtual root "/" is presented as the user profile folder, so paths read
 * like real Windows ones: /Desktop is C:\Users\Taaniel\Desktop. Input accepts
 * Windows paths, ~ paths, relative paths and the original /unix paths, and
 * resolves names case-insensitively the way NTFS does.
 *
 * Commands write through ShellFileSystem, which the terminal app backs with
 * the same store File Explorer uses - a folder made here shows up there.
 */

// ------------------------------------------------------------------ identity

export { PROFILE_ROOT, resolveShellPath, SHELL_HOST, SHELL_USER, toWindowsPath };

export const TERMINAL_HOME_PATH = "/";
export const POWERSHELL_VERSION = "7.4.5";

const CSI = "\x1b[";
const RESET = `${CSI}0m`;
const RED = `${CSI}91m`;
const TABLE = `${CSI}32;1m`;
const DIRECTORY = `${CSI}44;1m`;
const MATCH = `${CSI}7m`;

export function stripAnsi(text: string) {
  return text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
}

/**
 * A virtual path as it prints: Windows style, with control characters removed. A
 * folder name is data, never terminal commands - and names imported from a disk
 * can hold anything - so every path that reaches the screen goes through here.
 */
export function toDisplayPath(path: string) {
  return sanitizeForTerminal(toWindowsPath(path)).replace(/[\t\n]/g, "");
}

export function formatPrompt(cwd: string) {
  // The prompt is printed on every line.
  return `PS ${toDisplayPath(cwd)}> `;
}

/** The two lines PowerShell greets a new session with, then a pointer to the keys that matter here. */
export function getPowerShellBanner(): string[] {
  return [
    `PowerShell ${POWERSHELL_VERSION} on Taaniel OS`,
    "\x1b[90mType 'help' to see what this shell can do. Try: tree, ls, about, projects, notepad notes.txt\x1b[0m",
  ];
}

// --------------------------------------------------------------------- types

export type TerminalAction =
  | { type: "launch-app"; appId: AppId; payload?: WindowPayload; title?: string }
  | { type: "open-path"; path: string }
  /** Open a tab in this terminal window: `wt` does it, and so does Start-Process pwsh. No profile means the default one. */
  | { type: "open-tab"; profile?: ShellProfileId; directoryPath?: string }
  /**
   * Start a shell inside this one, in the same tab and folder: typing `cmd` or `pwsh`. `exit` returns to the shell it was
   * started from. With a command (`cmd /c dir`) the command runs and the shell ends; with `keep` (`/k`, -NoExit) it stays.
   */
  | { type: "enter-shell"; profile: ShellProfileId | "python"; command?: string; keep?: boolean }
  /** Rename this tab (cmd's `title`). */
  | { type: "set-title"; title: string }
  /** Recolour this tab's screen (cmd's `color`). Both are ANSI palette indices 0-15, read from the colour scheme in use. */
  | { type: "set-colors"; foreground: number; background: number }
  /** Back to the colour scheme's own colours (`color` with nothing after it). */
  | { type: "reset-colors" }
  /** Something worth a badge in the Achievements app. */
  | { type: "achievement"; id: string }
  | { type: "exit" };

/** The write surface the shell needs. The terminal app backs it with the filesystem store. */
export interface ShellFileSystem {
  getNodes: () => FileSystemRecord;
  mkdir: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<string>;
  rename: (path: string, nextName: string) => Promise<string>;
  deleteNode: (path: string) => Promise<void>;
  pasteNode: (sourcePath: string, destinationDirectoryPath: string, operation: "copy" | "cut") => Promise<void>;
}

export type { ShellValue };

export interface ShellSession {
  cwd: string;
  previousCwd: string | null;
  history: string[];
  /** $name = value assignments made in this session. Keys are lower-case. */
  variables: Record<string, ShellValue>;
  /** Push-Location / Pop-Location stack. */
  locationStack: string[];
  /** $? : whether the last statement worked. Absent until something has run. */
  lastSuccess?: boolean;
  /** $LASTEXITCODE: 0 after a statement that worked, 1 after one that failed. */
  lastExitCode?: number;
}

export interface ShellProcessInfo {
  id: string;
  name: string;
  title: string;
  minimized: boolean;
}

/**
 * Everything outside the filesystem the shell can touch. The terminal app
 * supplies real implementations; tests supply fakes; every member is optional
 * so a missing capability fails politely instead of crashing.
 */
/** What the shell needs from Python, which runs in a worker. */
export interface ShellPython {
  run: (code: string, args: string[], signal?: AbortSignal) => Promise<{ output: string; error?: string }>;
  version: (signal?: AbortSignal) => Promise<string>;
}

export interface ShellHost {
  python?: ShellPython;
  listProcesses?: () => ShellProcessInfo[];
  stopProcess?: (id: string) => void;
  readClipboard?: () => Promise<string>;
  writeClipboard?: (text: string) => Promise<void>;
  fetch?: typeof fetch;
  /** True while the OS is offline: network commands then fail without touching fetch. */
  isOffline?: () => boolean;
  /** Aborted when the person presses Ctrl+C: waiting commands stop and nothing more is printed. */
  signal?: AbortSignal;
}

export interface ShellResult {
  lines: string[];
  clear: boolean;
  actions: TerminalAction[];
  success: boolean;
  /** The command was cancelled with Ctrl+C before it finished. */
  interrupted?: boolean;
}

/** Thrown inside a command when the host's signal is aborted. */
class InterruptedError extends Error {}

/** The most lines one command may print: a runaway can't flood the terminal. */
export const MAX_OUTPUT_LINES = 20_000;

export function createShellSession(cwd = TERMINAL_HOME_PATH): ShellSession {
  return { cwd: normalizePath(cwd), previousCwd: null, history: [], variables: Object.create(null) as Record<string, ShellValue>, locationStack: [] };
}

interface Ctx {
  session: ShellSession;
  fs: ShellFileSystem;
  host: ShellHost;
  /** Nesting level of .ps1 scripts, to stop runaway recursion. */
  depth: number;
  lines: string[];
  actions: TerminalAction[];
  clear: boolean;
  /** Expression work done so far by this command: shared by every script block it runs. */
  budget: { steps: number };
  /** The objects the previous pipeline stage produced, when it produced any. */
  input: PipelineItem[] | null;
}

interface Output {
  out: string[];
  ok: boolean;
  /** The same output as live objects, for the next stage of the pipeline to work with. */
  objects?: PipelineItem[];
}

type CommandFn = (args: string[], stdin: string[] | null, ctx: Ctx, name: string) => Promise<Output> | Output;

interface CommandSpec {
  aliases: string[];
  synopsis: string;
  syntax: string;
  run: CommandFn;
}

const ok = (out: string[] = []): Output => ({ out, ok: true });

/** Own-key lookup: typing `constructor` or `__proto__` must never find something on Object.prototype. */
function own<T>(record: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

/**
 * Strip control characters from text the user didn't type - file contents,
 * file names, web responses - so it can't drive the terminal with escape
 * sequences (recolouring, cursor tricks, title or clipboard requests).
 * Tabs and newlines survive.
 */
export function sanitizeForTerminal(text: string) {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, "");
}

/** True when `text` holds a control character: C0, DEL or C1. */
export function hasControlCharacters(text: string) {
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u001F\u007F-\u009F]/.test(text);
}

function fail(ctx: Ctx, command: string, message: string): Output {
  sanitizeForTerminal(message)
    .split("\n")
    .forEach((line, index) => {
      ctx.lines.push(`${RED}${index === 0 ? `${sanitizeForTerminal(command)}: ` : ""}${line}${RESET}`);
    });
  return { out: [], ok: false };
}

/** Stop the running command if Ctrl+C was pressed. Called between stages, statements and script lines. */
function checkInterrupt(ctx: Ctx) {
  if (ctx.host.signal?.aborted) throw new InterruptedError("The command was interrupted.");
}

/** Abort `controller` when the host's signal does; returns the cleanup. */
function linkSignal(ctx: Ctx, controller: AbortController) {
  const signal = ctx.host.signal;
  if (!signal) return () => undefined;
  const onAbort = () => controller.abort();
  if (signal.aborted) controller.abort();
  signal.addEventListener("abort", onAbort, { once: true });
  return () => signal.removeEventListener("abort", onAbort);
}

// --------------------------------------------------------------------- paths

function baseName(path: string) {
  return normalizePath(path).split("/").filter(Boolean).at(-1) ?? "";
}

function joinVirtual(directory: string, name: string) {
  return directory === "/" ? `/${name}` : `${directory}/${name}`;
}

function displayRelative(path: string, cwd: string) {
  const prefix = cwd === "/" ? "/" : `${cwd}/`;
  return path.startsWith(prefix) ? sanitizeForTerminal(path.slice(prefix.length).replace(/\//g, "\\")).replace(/[\t\n]/g, "") : toDisplayPath(path);
}

function isInside(path: string, ancestor: string) {
  return path === ancestor || path.startsWith(ancestor === "/" ? "/" : `${ancestor}/`);
}

/** True when the file store would refuse to change this item: system folders and read-only content. */
function isLocked(nodes: FileSystemRecord, path: string) {
  const refusal = getChangeRefusal(nodes, path);
  return refusal === "protected" || refusal === "read-only";
}

/** Expand * and ? in the last path segment. Literal args pass through unchanged. */
function expandPaths(args: string[], ctx: Ctx) {
  const nodes = ctx.fs.getNodes();
  const resolved: Array<{ arg: string; path: string }> = [];

  for (const arg of args) {
    if (!/[*?]/.test(arg)) {
      resolved.push({ arg, path: resolveShellPath(arg, ctx.session.cwd, nodes) });
      continue;
    }

    const normalized = arg.replace(/\//g, "\\");
    const separator = normalized.lastIndexOf("\\");
    const directoryPart = separator >= 0 ? normalized.slice(0, separator + 1) : "";
    const pattern = separator >= 0 ? normalized.slice(separator + 1) : normalized;
    const directory = resolveShellPath(directoryPart || ".", ctx.session.cwd, nodes);
    const regex = new RegExp(
      `^${pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`,
      "i"
    );

    childrenOf(nodes, directory)
      .filter((node) => regex.test(node.name))
      .forEach((node) => resolved.push({ arg, path: node.path }));
  }

  return resolved;
}

// ------------------------------------------------------------- tokenization

type Token = { kind: "word"; value: string; literal: boolean; quoted: boolean } | { kind: "op"; value: "|" | ";" | ">" | ">>" | "&&" | "||" };

/** Index of the } that closes the { at `open`, skipping quoted text; -1 when it never closes. */
function findBlockEnd(input: string, open: number) {
  let depth = 0;
  for (let index = open; index < input.length; index += 1) {
    const char = input[index];
    if (char === "'") {
      index += 1;
      while (index < input.length && !(input[index] === "'" && input[index + 1] !== "'")) index += input[index] === "'" ? 2 : 1;
    } else if (char === '"') {
      index += 1;
      while (index < input.length && input[index] !== '"') index += input[index] === "`" ? 2 : 1;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

export function isScriptBlock(argument: string) {
  return argument.length >= 2 && argument.startsWith("{") && argument.endsWith("}");
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let current = "";
  let inWord = false;
  let literal = false;
  let quoted = false;
  let i = 0;

  const flush = () => {
    if (inWord) tokens.push({ kind: "word", value: current, literal, quoted });
    current = "";
    inWord = false;
    literal = false;
    quoted = false;
  };

  while (i < input.length) {
    const char = input[i];

    // A { script block } is one word, kept exactly as typed: $_ inside it is not expanded here.
    if (char === "{" && !inWord) {
      const end = findBlockEnd(input, i);
      if (end !== -1) {
        tokens.push({ kind: "word", value: input.slice(i, end + 1), literal: true, quoted: false });
        i = end + 1;
        continue;
      }
    }

    if (char === "'") {
      inWord = true;
      literal = true;
      quoted = true;
      i += 1;
      while (i < input.length) {
        if (input[i] === "'") {
          if (input[i + 1] === "'") {
            current += "'";
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        current += input[i];
        i += 1;
      }
      continue;
    }

    if (char === '"') {
      inWord = true;
      quoted = true;
      i += 1;
      while (i < input.length && input[i] !== '"') {
        if (input[i] === "`" && i + 1 < input.length) {
          current += unescapeBacktick(input[i + 1]);
          i += 2;
          continue;
        }
        current += input[i];
        i += 1;
      }
      i += 1;
      continue;
    }

    if (char === "`" && i + 1 < input.length) {
      inWord = true;
      current += unescapeBacktick(input[i + 1]);
      i += 2;
      continue;
    }

    if (/\s/.test(char)) {
      flush();
      i += 1;
      continue;
    }

    // PowerShell 7's pipeline chain operators: && runs the next only after success, || only after failure.
    if ((char === "|" || char === "&") && input[i + 1] === char) {
      flush();
      tokens.push({ kind: "op", value: char === "|" ? "||" : "&&" });
      i += 2;
      continue;
    }

    if (char === "|" || char === ";") {
      flush();
      tokens.push({ kind: "op", value: char });
      i += 1;
      continue;
    }

    if (char === ">") {
      flush();
      if (input[i + 1] === ">") {
        tokens.push({ kind: "op", value: ">>" });
        i += 2;
      } else {
        tokens.push({ kind: "op", value: ">" });
        i += 1;
      }
      continue;
    }

    inWord = true;
    current += char;
    i += 1;
  }

  flush();
  return tokens;
}

function environment(ctx: Ctx): Record<string, string> {
  return {
    username: SHELL_USER,
    userprofile: PROFILE_ROOT,
    computername: SHELL_HOST,
    homedrive: "C:",
    homepath: `\\Users\\${SHELL_USER}`,
    os: "Taaniel_OS",
    temp: `${PROFILE_ROOT}\\AppData\\Local\\Temp`,
    pwd: toDisplayPath(ctx.session.cwd),
  };
}

// ----------------------------------------------------- automatic variables

/** $PSVersionTable.PSVersion: Major, Minor and Patch read off POWERSHELL_VERSION. */
function psVersionObject(): ShellObject {
  const [major, minor, patch] = POWERSHELL_VERSION.split(".").map(Number);
  return createObject(
    "System.Management.Automation.SemanticVersion",
    { Major: major, Minor: minor, Patch: patch, PreReleaseLabel: "", BuildLabel: "" },
    POWERSHELL_VERSION,
    { view: "table" }
  );
}

const OS_ROW = "Taaniel OS 11.0";

/** The rows of $PSVersionTable, in the order PowerShell lists them. */
function psVersionRows(): Array<[string, PropertyValue]> {
  return [
    ["PSVersion", psVersionObject()],
    ["PSEdition", "Core"],
    ["GitCommitId", POWERSHELL_VERSION],
    ["OS", OS_ROW],
    ["Platform", "Win32NT"],
    ["PSCompatibleVersions", "{1.0, 2.0, 3.0, 4.0…}"],
    ["PSRemotingProtocolVersion", "2.3"],
    ["SerializationVersion", "1.1.0.1"],
    ["WSManStackVersion", "3.0"],
  ];
}

function psVersionTable(): ShellObject {
  return createObject("System.Collections.Hashtable", Object.fromEntries(psVersionRows()), "System.Collections.Hashtable");
}

function pathInfoObject(virtualPath: string): ShellObject {
  const shown = toDisplayPath(virtualPath);
  return createObject(
    "System.Management.Automation.PathInfo",
    { Drive: "C", Provider: "FileSystem", ProviderPath: shown, Path: shown },
    shown,
    { view: "scalar" }
  );
}

/** One id for this page's lifetime, as a host has one per session. */
const HOST_INSTANCE_ID = globalThis.crypto?.randomUUID?.() ?? "5d0bd2a7-3f1c-4b6e-9a58-7c2e1d4f8b03";

function hostObject(): ShellObject {
  const language = typeof navigator === "undefined" ? "en-US" : navigator.language || "en-US";
  return createObject(
    "System.Management.Automation.Internal.Host.InternalHost",
    {
      Name: "ConsoleHost",
      Version: POWERSHELL_VERSION,
      InstanceId: HOST_INSTANCE_ID,
      CurrentCulture: language,
      CurrentUICulture: language,
      DebuggerEnabled: true,
      IsRunspacePushed: false,
    },
    `Taaniel OS terminal (PowerShell ${POWERSHELL_VERSION})`
  );
}

/** Look up $name: environment, automatic variables, then the session's own. */
function readVariable(rawName: string, ctx: Ctx): ShellValue | ShellObject | undefined {
  const name = rawName.toLowerCase();
  if (name.startsWith("env:")) return own(environment(ctx), name.slice(4));
  switch (name) {
    case "home":
      return PROFILE_ROOT;
    case "pwd":
      return pathInfoObject(ctx.session.cwd);
    case "true":
      return true;
    case "false":
      return false;
    case "null":
      return "";
    case "host":
      return hostObject();
    case "psversiontable":
      return psVersionTable();
    case "?":
      return ctx.session.lastSuccess ?? true;
    case "lastexitcode":
      return own(ctx.session.variables, name) ?? ctx.session.lastExitCode ?? 0;
    default:
      return own(ctx.session.variables, name);
  }
}

/** Expand $name, $env:NAME and $( expression ) in a command word. A $(...) that fails is left as typed. */
function expandVariables(word: string, ctx: Ctx) {
  try {
    return interpolateString(word, expressionEnv(ctx));
  } catch (error) {
    if (error instanceof ExpressionError) return word;
    throw error;
  }
}

/** A word as typed. It is expanded just before its statement runs, so `$?` sees the statement before it. */
interface Word {
  value: string;
  literal: boolean;
  /** Typed inside quotes: at the head of a pipeline stage it is a value, not a command name. */
  quoted: boolean;
}

interface Statement {
  stages: Word[][];
  redirect?: { append: boolean; target: Word };
  /** How this statement hangs on the one before it: && after success only, || after failure only. */
  chain?: "&&" | "||";
}

function parseStatements(tokens: Token[]): Statement[] | string {
  const statements: Statement[] = [];
  let stages: Word[][] = [[]];
  let redirect: Statement["redirect"];
  let chain: Statement["chain"];

  const hasWords = () => stages.some((stage) => stage.length > 0);
  const closeStatement = () => {
    if (hasWords()) statements.push({ stages, redirect, chain });
    stages = [[]];
    redirect = undefined;
    chain = undefined;
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.kind === "word") {
      stages[stages.length - 1].push({ value: token.value, literal: token.literal, quoted: token.quoted });
      continue;
    }

    if (token.value === ";") {
      if (stages.some((stage) => stage.length === 0) && stages.length > 1) return "An empty pipe element is not allowed.";
      if (chain && !hasWords()) return `Missing statement after '${chain}'.`;
      closeStatement();
      continue;
    }

    if (token.value === "|") {
      if (stages[stages.length - 1].length === 0) return "An empty pipe element is not allowed.";
      stages.push([]);
      continue;
    }

    if (token.value === "&&" || token.value === "||") {
      if (!hasWords()) return `Unexpected token '${token.value}' in expression or statement.`;
      if (stages.some((stage) => stage.length === 0)) return "An empty pipe element is not allowed.";
      const operator = token.value;
      closeStatement();
      chain = operator;
      continue;
    }

    const target = tokens[index + 1];
    if (!target || target.kind !== "word") return "Missing file specification after redirection operator.";
    redirect = { append: token.value === ">>", target: { value: target.value, literal: target.literal, quoted: target.quoted } };
    index += 1;
  }

  if (stages.length > 1 && stages[stages.length - 1].length === 0) return "An empty pipe element is not allowed.";
  if (chain && !hasWords()) return `Missing statement after '${chain}'.`;
  closeStatement();
  return statements;
}

/** Expand $variables and $( expressions ) in a statement's words, now that the statements before it have run. */
function expandStatement(statement: Statement, ctx: Ctx): { stages: string[][]; redirect?: { append: boolean; target: string } } {
  const expand = (word: Word) => (word.literal ? word.value : expandVariables(word.value, ctx));
  return {
    stages: statement.stages.map((stage) => stage.map(expand)),
    redirect: statement.redirect ? { append: statement.redirect.append, target: expand(statement.redirect.target) } : undefined,
  };
}

// ------------------------------------------------------------ argument parsing

interface ParsedArgs {
  positional: string[];
  switches: Set<string>;
  params: Record<string, string>;
  unknown: string[];
}

/** PowerShell-style -Parameter parsing with case-insensitive unique-prefix matching. */
function parseArgs(args: string[], spec: { switches?: string[]; params?: string[] } = {}): ParsedArgs {
  const switches = spec.switches ?? [];
  const params = spec.params ?? [];
  const parsed: ParsedArgs = { positional: [], switches: new Set(), params: {}, unknown: [] };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!/^-[A-Za-z]/.test(arg)) {
      parsed.positional.push(arg);
      continue;
    }

    const [rawName, inlineValue] = arg.slice(1).split(":", 2);
    const name = rawName.toLowerCase();
    const pick = (list: string[]) => {
      const exact = list.find((entry) => entry.toLowerCase() === name);
      if (exact) return exact;
      const prefixed = list.filter((entry) => entry.toLowerCase().startsWith(name));
      return prefixed.length === 1 ? prefixed[0] : null;
    };

    const param = pick(params);
    if (param) {
      const value = inlineValue ?? args[index + 1];
      if (inlineValue === undefined) index += 1;
      if (value !== undefined) parsed.params[param] = value;
      continue;
    }

    const flag = pick(switches);
    if (flag) {
      parsed.switches.add(flag);
      continue;
    }

    parsed.unknown.push(arg);
  }

  return parsed;
}

function unknownParameter(ctx: Ctx, command: string, parsed: ParsedArgs) {
  return fail(ctx, command, `A parameter cannot be found that matches parameter name '${parsed.unknown[0].replace(/^-/, "")}'.`);
}

// --------------------------------------------------------------- formatting

function fileLength(node: VirtualNode) {
  if (node.kind !== "file") return "";
  if (typeof node.size === "number") return String(node.size);
  if (typeof node.content === "string") return String(node.content.length);
  return "";
}

function formatWriteTime(timestamp: number) {
  const date = new Date(timestamp);
  const day = new Intl.DateTimeFormat([], { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  const time = new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit" }).format(date);
  return `${day.padStart(10)} ${time.padStart(8)}`;
}

function modeOf(node: VirtualNode, hidden = false) {
  if (node.kind === "directory") return hidden ? "d--h-" : "d----";
  return node.readonly ? "-ar--" : "-a---";
}

const FILE_TABLE_HEADER = `${"Mode".padEnd(15)}${"LastWriteTime".padStart(19)}${"Length".padStart(15)} Name`;
const FILE_TABLE_RULE = `${"----".padEnd(15)}${"-------------".padStart(19)}${"------".padStart(15)} ----`;

/** One row of a directory listing: mode, last write time, length ("" for folders), name. */
function fileTableRow(mode: string, updatedAt: number, length: string, name: string, isDirectory: boolean) {
  const safeName = sanitizeForTerminal(name);
  const shown = isDirectory ? `${DIRECTORY}${safeName}${RESET}` : safeName;
  return `${mode.padEnd(15)}${formatWriteTime(updatedAt)} ${length.padStart(14)} ${shown}`;
}

function fileTableBlock(directoryPath: string, rows: string[]) {
  return ["", `    Directory: ${toDisplayPath(directoryPath)}`, "", `${TABLE}${FILE_TABLE_HEADER}${RESET}`, `${TABLE}${FILE_TABLE_RULE}${RESET}`, ...rows, ""];
}

function formatTable(directoryPath: string, entries: VirtualNode[], nameOnly = false) {
  if (nameOnly) return entries.map((node) => sanitizeForTerminal(node.name));

  const rows = entries.map((node) =>
    fileTableRow(modeOf(node, node.path === TRASH_PATH), node.updatedAt, fileLength(node), node.name, node.kind === "directory")
  );

  return fileTableBlock(directoryPath, rows);
}

// ------------------------------------------------------- pipeline objects

/** A file or folder as the objects Get-ChildItem hands down a pipeline. */
function fileObject(node: VirtualNode): ShellObject {
  const isDirectory = node.kind === "directory";
  const length = fileLength(node);
  const baseName = isDirectory ? node.name : node.name.replace(/\.[^.]*$/, "");
  return createObject(
    isDirectory ? "System.IO.DirectoryInfo" : "System.IO.FileInfo",
    {
      Name: sanitizeForTerminal(node.name),
      Length: isDirectory || length === "" ? null : Number(length),
      DirectoryName: toDisplayPath(getParentPath(node.path)),
      IsReadOnly: node.kind === "file" && node.readonly === true,
      FullName: toDisplayPath(node.path),
      Extension: node.kind === "file" && node.extension ? `.${node.extension}` : "",
      BaseName: sanitizeForTerminal(baseName),
      CreationTime: { kind: "date", time: node.createdAt },
      LastWriteTime: { kind: "date", time: node.updatedAt },
      Mode: modeOf(node, node.path === TRASH_PATH),
      PSIsContainer: isDirectory,
    },
    sanitizeForTerminal(node.name),
    { view: "filesystem", path: node.path }
  );
}

/** The listing view for file objects, one Directory: block per folder they sit in. */
function formatFileObjects(objects: ShellObject[]): string[] {
  const out: string[] = [];
  let block: { directory: string; rows: string[] } | null = null;
  const flush = () => {
    if (block) out.push(...fileTableBlock(block.directory, block.rows));
    block = null;
  };

  for (const object of objects) {
    const directory = getParentPath(object.path ?? "/");
    if (!block || block.directory !== directory) {
      flush();
      block = { directory, rows: [] };
    }
    const time = getProperty(object, "LastWriteTime");
    const length = getProperty(object, "Length");
    block.rows.push(
      fileTableRow(
        String(getProperty(object, "Mode") ?? ""),
        isShellDate(time) ? time.time : 0,
        typeof length === "number" ? String(length) : "",
        String(getProperty(object, "Name") ?? ""),
        getProperty(object, "PSIsContainer") === true
      )
    );
  }
  flush();
  return out;
}

const PROCESS_TABLE_HEADER = `${"Id".padStart(6)} ${"ProcessName".padEnd(14)} ${"Status".padEnd(10)} MainWindowTitle`;
const PROCESS_TABLE_RULE = `${"--".padStart(6)} ${"-----------".padEnd(14)} ${"------".padEnd(10)} ---------------`;

function formatProcessObjects(objects: ShellObject[]): string[] {
  return [
    "",
    `${TABLE}${PROCESS_TABLE_HEADER}${RESET}`,
    `${TABLE}${PROCESS_TABLE_RULE}${RESET}`,
    ...objects.map(
      (object) =>
        `${String(getProperty(object, "Id") ?? "").padStart(6)} ${String(getProperty(object, "ProcessName") ?? "").padEnd(14)} ${String(getProperty(object, "Status") ?? "").padEnd(10)} ${String(getProperty(object, "MainWindowTitle") ?? "")}`
    ),
    "",
  ];
}

/**
 * What PowerShell prints for objects nothing has formatted: files as a
 * directory listing, apps as the process table, everything else as a table
 * (up to four properties) or a list. Text items print as they are.
 */
function renderItems(items: PipelineItem[], layout: "default" | "table" | "list" = "default"): string[] {
  const kindOf = (item: PipelineItem) => (isShellObject(item) ? `object:${item.view ?? item.typeName}` : "text");
  const lines: string[] = [];
  let start = 0;

  while (start < items.length) {
    const kind = kindOf(items[start]);
    let end = start + 1;
    while (end < items.length && kindOf(items[end]) === kind) end += 1;
    const run = items.slice(start, end);

    if (kind === "text") {
      run.forEach((item) => lines.push(...itemText(item).split("\n")));
    } else {
      const objects = run.filter(isShellObject);
      if (layout === "list") lines.push(...formatListView(objects));
      else if (objects[0].view === "filesystem") lines.push(...formatFileObjects(objects));
      else if (objects[0].view === "process") lines.push(...formatProcessObjects(objects));
      else if (objects[0].view === "table") lines.push(...formatTableView(objects));
      else if (objects[0].view === "scalar") lines.push(...formatTableView(objects, [Object.keys(objects[0].properties).at(-1) ?? ""]));
      else lines.push(...(layout === "table" ? formatTableView(objects) : formatGenericView(objects)));
    }
    start = end;
  }

  return lines;
}

function textContent(node: VirtualNode) {
  if (node.kind !== "file" || typeof node.content !== "string") return null;
  return node.content.replace(/\r?\n$/, "");
}

function buildMatcher(pattern: string, simple: boolean, caseSensitive: boolean) {
  const flags = caseSensitive ? "g" : "gi";
  if (!simple) {
    try {
      return new RegExp(pattern, flags);
    } catch {
      // Not a valid regex - fall back to a literal match, like -SimpleMatch.
    }
  }
  return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
}

function highlight(line: string, matcher: RegExp) {
  return line.replace(matcher, (match) => (match ? `${MATCH}${match}${RESET}` : match));
}

// ----------------------------------------------------------------- launching

const EXECUTABLES: Record<string, AppId> = {
  notepad: "notes",
  calc: "calculator",
  mspaint: "paint",
  explorer: "files",
  code: "editor",
  msedge: "browser",
  chrome: "browser",
  firefox: "browser",
  iexplore: "browser",
  wt: "terminal",
  pwsh: "terminal",
  powershell: "terminal",
  cmd: "terminal",
  control: "settings",
  "ms-settings:": "settings",
  "ms-photos:": "photos",
  wmplayer: "music",
  acrord32: "pdf",
  winver: "about",
  // The Windows Subsystem for Linux, here: the v86 x86 emulator running a real Linux.
  wsl: "v86",
  bash: "v86",
};

const PATH_SHORTCUTS: Record<string, string> = {
  cv: "/Documents/Taaniel-Vananurm-CV.pdf",
  resume: "/Documents/Taaniel-Vananurm-CV.pdf",
  music: "/Media/Music",
  photos: "/Media/Photography",
  photography: "/Media/Photography",
  projects: "/Portfolio/Case Studies",
};

function isUrl(value: string) {
  return /^(https?:\/\/|www\.)/i.test(value);
}

export type SettingsSection = SettingsSectionId;

const SETTINGS_PAGES: Record<string, SettingsSection> = {
  display: "display",
  sound: "sound",
  network: "network",
  "network-status": "network",
  "network-wifi": "network",
  batterysaver: "power",
  powersleep: "power",
  easeofaccess: "accessibility",
  personalization: "personalization",
};

/**
 * The Settings section an ms-settings: URI opens, as Windows maps its pages.
 * A bare "ms-settings:" opens Settings on its home page (null); unknown pages land on System.
 */
export function settingsSectionFromUri(uri: string): SettingsSection | null {
  const page = uri.trim().replace(/^ms-settings:/i, "").toLowerCase();
  if (!page) return null;
  const known = own(SETTINGS_PAGES, page);
  if (known) return known;
  if (page.startsWith("easeofaccess-")) return "accessibility";
  if (page.startsWith("personalization-")) return "personalization";
  return "system";
}

function openSettingsUri(uri: string, ctx: Ctx): Output {
  const section = settingsSectionFromUri(uri);
  if (!section) {
    ctx.actions.push({ type: "launch-app", appId: "settings" });
    return ok();
  }
  ctx.actions.push({ type: "launch-app", appId: "settings", payload: { section } });
  return ok();
}

/** True for names that launch an app by themselves: notepad, calc, explorer, ms-settings:display... */
export function isExecutableName(name: string) {
  const program = name.toLowerCase().replace(/\.exe$/, "");
  return own(EXECUTABLES, program) !== undefined || PYTHON_NAMES.has(program) || /^ms-settings:./i.test(name);
}

export const LINUX_LAUNCH_MESSAGE = [
  "Booting Linux in Virtual x86: a real kernel on v86, an x86 emulator running in your browser.",
  "Click its window to type. Open a .img or .iso from File Explorer to boot something else.",
];

const PYTHON_NAMES = new Set(["python", "python3", "py"]);

function pythonLines(text: string) {
  return sanitizeForTerminal(text).replace(/\n$/, "").split("\n");
}

/** python, python file.py [args], python -c "code", python --version. */
async function runPython(name: string, args: string[], ctx: Ctx): Promise<Output> {
  const python = ctx.host.python;
  if (!python) return fail(ctx, name, "Python is not available here.");

  const first = args[0];
  ctx.actions.push({ type: "achievement", id: "python" });
  if (first === undefined) {
    ctx.actions.push({ type: "enter-shell", profile: "python" });
    return ok();
  }

  try {
    if (first === "--version" || first === "-V") return ok([`Python ${await python.version(ctx.host.signal)}`]);

    let code: string;
    let argv: string[];
    if (first === "-c") {
      if (args[1] === undefined) return fail(ctx, name, "Argument expected for the -c option.");
      code = args[1];
      argv = ["-c", ...args.slice(2)];
    } else {
      const nodes = ctx.fs.getNodes();
      const path = resolveShellPath(first, ctx.session.cwd, nodes);
      const file = nodes[path];
      if (file?.kind !== "file" || file.content === undefined) {
        return fail(ctx, name, `can't open file '${toDisplayPath(path)}': No such file or directory`);
      }
      code = file.content;
      argv = [first, ...args.slice(1)];
    }

    const result = await python.run(code, argv, ctx.host.signal);
    const lines = result.output ? pythonLines(result.output) : [];
    if (!result.error) return ok(lines);
    return { out: [...lines, ...pythonLines(result.error).map((line) => `\x1b[91m${line}\x1b[0m`)], ok: false };
  } catch (error) {
    if (ctx.host.signal?.aborted) throw new InterruptedError();
    return fail(ctx, name, error instanceof Error ? error.message : "Python could not start.");
  }
}

/** The shells and Windows Terminal itself: each opens a tab here rather than another window. */
const TERMINAL_EXECUTABLES: Record<string, ShellProfileId | undefined> = {
  wt: undefined,
  pwsh: "pwsh",
  powershell: "pwsh",
  cmd: "cmd",
};

/** Options of pwsh that take a value after them, so the value is not mistaken for the next option. */
const POWERSHELL_VALUE_OPTIONS = new Set(["-executionpolicy", "-ep", "-windowstyle", "-workingdirectory", "-wd", "-configurationname", "-inputformat", "-outputformat", "-version"]);

const quoteArgument = (value: string) => `'${value.replace(/'/g, "''")}'`;

/**
 * What typing `cmd` or `pwsh` asks for: a shell inside this one. `cmd /c <command>` and `pwsh -Command <command>` run the
 * command and return; `/k` and -NoExit run it and stay. Other options (-NoLogo, -NoProfile, /q...) change nothing here.
 */
function enterShell(name: string, args: string[], ctx: Ctx): Output {
  const profile = own(TERMINAL_EXECUTABLES, name) ?? "pwsh";
  let command: string | undefined;
  let keep = false;

  if (profile === "cmd") {
    const index = args.findIndex((arg) => /^\/[ck]$/i.test(arg));
    if (index >= 0) {
      command = args.slice(index + 1).join(" ");
      keep = args[index].toLowerCase() === "/k";
    }
  } else {
    for (let index = 0; index < args.length; index += 1) {
      const option = args[index].toLowerCase();
      if (option === "-c" || option === "-command") {
        command = args.slice(index + 1).join(" ");
        break;
      }
      if (option === "-f" || option === "-file") {
        command = [`& ${quoteArgument(args[index + 1] ?? "")}`, ...args.slice(index + 2).map(quoteArgument)].join(" ");
        break;
      }
      if (option === "-noexit") keep = true;
      else if (POWERSHELL_VALUE_OPTIONS.has(option)) index += 1;
    }
  }

  // A command that is empty (cmd /c with nothing after it) is just a shell.
  if (command !== undefined && !command.trim()) command = undefined;
  ctx.actions.push({ type: "enter-shell", profile, ...(command !== undefined ? { command, keep } : {}) });
  return ok();
}

/** wt [-p <profile>] [-d <folder>]: the options of Windows Terminal that mean something here. */
function openTerminalTab(name: string, args: string[], ctx: Ctx, nested: boolean): Output {
  // Typing a shell's name starts it inside this one; `wt`, and Start-Process (a new window), open a tab.
  if (nested && name !== "wt") return enterShell(name, args, ctx);
  let profile = own(TERMINAL_EXECUTABLES, name);
  let directory: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index].toLowerCase();
    const value = args[index + 1];
    if (name === "wt" && (flag === "-p" || flag === "--profile") && value !== undefined) {
      const requested = resolveLaunchProfile(value);
      if (requested === "linux") {
        ctx.actions.push({ type: "launch-app", appId: "v86" });
        return ok([...LINUX_LAUNCH_MESSAGE]);
      }
      profile = requested ?? profile;
      index += 1;
    } else if ((flag === "-d" || flag === "--startingdirectory") && value !== undefined) {
      directory = value;
      index += 1;
    }
  }

  let directoryPath: string | undefined;
  if (directory !== undefined) {
    const nodes = ctx.fs.getNodes();
    const path = resolveShellPath(directory, ctx.session.cwd, nodes);
    if (nodes[path]?.kind !== "directory") return fail(ctx, name, `Cannot find path '${toDisplayPath(path)}' because it does not exist.`);
    directoryPath = path;
  }

  ctx.actions.push({ type: "open-tab", profile, directoryPath });
  return ok();
}

/** `nested` is a program typed at the prompt, as against one started with Start-Process, which opens a window of its own. */
async function launchExecutable(name: string, args: string[], ctx: Ctx, nested = false): Promise<Output> {
  if (PYTHON_NAMES.has(name)) return runPython(name, args, ctx);

  const appId = own(EXECUTABLES, name);
  const target = args.find((arg) => !arg.startsWith("-"));

  if (own(TERMINAL_EXECUTABLES, name) !== undefined || name === "wt") return openTerminalTab(name, args, ctx, nested);
  if (!appId) return fail(ctx, name, "This command cannot be run due to the error: The system cannot find the file specified.");

  if (appId === "v86") {
    ctx.actions.push({ type: "launch-app", appId });
    return ok([...LINUX_LAUNCH_MESSAGE]);
  }

  if (appId === "browser" && target) {
    const url = isUrl(target) ? (target.startsWith("www.") ? `https://${target}` : target) : target;
    ctx.actions.push({ type: "launch-app", appId, payload: { externalUrl: url } });
    return ok();
  }

  if (target && (appId === "files" || appId === "notes" || appId === "editor")) {
    const nodes = ctx.fs.getNodes();
    const path = resolveShellPath(target, ctx.session.cwd, nodes);
    let node = nodes[path];

    // Notepad offers to create a file that does not exist yet.
    if (!node && appId === "notes") {
      const parent = nodes[getParentPath(path)];
      if (parent?.kind === "directory") {
        await ctx.fs.writeFile(path, "");
        node = ctx.fs.getNodes()[path];
      }
    }

    if (!node) {
      return fail(ctx, name, `Cannot find path '${toDisplayPath(path)}' because it does not exist.`);
    }

    if (node.kind === "directory") {
      ctx.actions.push({ type: "launch-app", appId: appId === "editor" ? "editor" : "files", payload: { directoryPath: path } });
    } else if (appId === "files") {
      ctx.actions.push({ type: "open-path", path });
    } else {
      ctx.actions.push({ type: "launch-app", appId, payload: { filePath: path } });
    }
    return ok();
  }

  ctx.actions.push({ type: "launch-app", appId });
  return ok();
}

// ------------------------------------------------------------------- commands

const getChildItem: CommandFn = (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, {
    switches: ["Force", "Name", "Recurse", "Directory", "File"],
    params: ["Path", "Filter", "Depth"],
  });
  // Unix muscle memory (ls -la) is tolerated rather than rejected.
  const targets = parsed.params.Path ? [parsed.params.Path, ...parsed.positional] : parsed.positional;
  const nodes = ctx.fs.getNodes();
  const resolved = targets.length ? expandPaths(targets, ctx) : [{ arg: ".", path: ctx.session.cwd }];
  const out: string[] = [];
  const objects: ShellObject[] = [];
  const nameOnly = parsed.switches.has("Name");
  let okay = true;

  // -Depth <levels below the folder> implies -Recurse, as in PowerShell 5 and later.
  const depthText = parsed.params.Depth;
  const maxDepth = depthText === undefined ? undefined : Number(depthText);
  if (depthText !== undefined && (!Number.isInteger(maxDepth) || (maxDepth as number) < 0)) {
    return fail(ctx, name, `Cannot bind parameter 'Depth'. Cannot convert value "${depthText}" to type "System.UInt32". Error: "Input string was not in a correct format."`);
  }
  const recurse = parsed.switches.has("Recurse") || maxDepth !== undefined;

  const filterEntries = (entries: VirtualNode[]) =>
    entries.filter((node) => {
      if (!parsed.switches.has("Force") && node.path === TRASH_PATH) return false;
      if (parsed.switches.has("Directory") && node.kind !== "directory") return false;
      if (parsed.switches.has("File") && node.kind !== "file") return false;
      if (parsed.params.Filter) {
        const regex = new RegExp(`^${parsed.params.Filter.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i");
        return regex.test(node.name);
      }
      return true;
    });

  const listDirectory = (directoryPath: string, level = 0) => {
    const entries = filterEntries(childrenOf(nodes, directoryPath));
    if (entries.length) out.push(...formatTable(directoryPath, entries, nameOnly));
    entries.forEach((entry) => objects.push(fileObject(entry)));
    if (recurse && (maxDepth === undefined || level < maxDepth)) {
      childrenOf(nodes, directoryPath)
        .filter((node) => node.kind === "directory" && node.path !== TRASH_PATH)
        .forEach((node) => listDirectory(node.path, level + 1));
    }
  };

  if (targets.length && resolved.length === 0) return ok();

  for (const { path } of resolved) {
    const node = nodes[path];
    if (!node) {
      fail(ctx, name, `Cannot find path '${toDisplayPath(path)}' because it does not exist.`);
      okay = false;
      continue;
    }
    if (node.kind === "directory") {
      listDirectory(path);
    } else {
      out.push(...formatTable(getParentPath(path), [node], nameOnly));
      objects.push(fileObject(node));
    }
  }

  // -Name lists plain strings, as PowerShell does: the next stage gets text, not file objects.
  return { out, ok: okay, objects: nameOnly ? undefined : objects };
};

const setLocation: CommandFn = (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { params: ["Path"] });
  const target = parsed.params.Path ?? parsed.positional[0];

  if (target === "-") {
    if (!ctx.session.previousCwd) return fail(ctx, name, "There is no location history left to navigate backwards.");
    const back = ctx.session.previousCwd;
    ctx.session.previousCwd = ctx.session.cwd;
    ctx.session.cwd = back;
    return ok();
  }

  const nodes = ctx.fs.getNodes();
  const path = target === undefined ? TERMINAL_HOME_PATH : resolveShellPath(target, ctx.session.cwd, nodes);
  const node = nodes[path];

  if (!node || node.kind !== "directory") {
    return fail(ctx, name, `Cannot find path '${toDisplayPath(path)}' because it does not exist.`);
  }

  if (path !== ctx.session.cwd) {
    ctx.session.previousCwd = ctx.session.cwd;
    ctx.session.cwd = path;
  }
  return ok();
};

const getLocation: CommandFn = (_args, _stdin, ctx) =>
  ok(["", `${TABLE}Path${RESET}`, `${TABLE}----${RESET}`, toDisplayPath(ctx.session.cwd), ""]);

const getContent: CommandFn = (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { params: ["Path", "TotalCount", "Head", "First", "Tail", "Last"] });
  const targets = parsed.params.Path ? [parsed.params.Path, ...parsed.positional] : parsed.positional;
  if (!targets.length) return fail(ctx, name, "Cannot bind argument to parameter 'Path' because it is an empty array.");
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);

  const head = Number(parsed.params.TotalCount ?? parsed.params.Head ?? parsed.params.First);
  const tail = Number(parsed.params.Tail ?? parsed.params.Last);
  const nodes = ctx.fs.getNodes();
  const out: string[] = [];
  let okay = true;

  for (const { path } of expandPaths(targets, ctx)) {
    const node = nodes[path];
    if (!node) {
      fail(ctx, name, `Cannot find path '${toDisplayPath(path)}' because it does not exist.`);
      okay = false;
      continue;
    }
    if (node.kind === "directory") {
      fail(ctx, name, `Unable to get content because it is a directory: '${toDisplayPath(path)}'. Please use 'Get-ChildItem' instead.`);
      okay = false;
      continue;
    }
    const text = textContent(node);
    if (text === null) {
      fail(ctx, name, `'${node.name}' is not a text file. Open it with: start '${displayRelative(path, ctx.session.cwd)}'`);
      okay = false;
      continue;
    }
    let lines = text.length ? sanitizeForTerminal(text).split("\n") : [];
    if (Number.isFinite(head) && head >= 0) lines = lines.slice(0, head);
    if (Number.isFinite(tail) && tail >= 0) lines = tail === 0 ? [] : lines.slice(-tail);
    out.push(...lines);
  }

  return { out, ok: okay };
};

async function ensureDirectory(ctx: Ctx, path: string) {
  const segments = path.split("/").filter(Boolean);
  let current = "";
  for (const segment of segments) {
    current = `${current}/${segment}`;
    const existing = ctx.fs.getNodes()[current];
    if (!existing) await ctx.fs.mkdir(current);
    else if (existing.kind !== "directory") return false;
  }
  return true;
}

function createItemListing(path: string, ctx: Ctx) {
  const node = ctx.fs.getNodes()[path];
  return node ? formatTable(getParentPath(path), [node]) : [];
}

async function newItemCore(
  ctx: Ctx,
  name: string,
  path: string,
  kind: "file" | "directory",
  value: string | undefined,
  force: boolean
): Promise<Output> {
  const nodes = ctx.fs.getNodes();
  const existing = nodes[path];
  const display = toDisplayPath(path);

  if (path === "/") return fail(ctx, name, `An item with the specified name ${display} already exists.`);

  if (existing && !(force && kind === "file" && existing.kind === "file")) {
    return fail(ctx, name, `An item with the specified name ${display} already exists.`);
  }

  if (kind === "directory") {
    if (!(await ensureDirectory(ctx, path))) {
      return fail(ctx, name, `An item with the specified name ${toDisplayPath(getParentPath(path))} already exists.`);
    }
    return ok(createItemListing(path, ctx));
  }

  const parent = getParentPath(path);
  const parentNode = nodes[parent];
  if (!parentNode) {
    if (!force) return fail(ctx, name, `Could not find a part of the path '${display}'.`);
    if (!(await ensureDirectory(ctx, parent))) return fail(ctx, name, `Could not find a part of the path '${display}'.`);
  } else if (parentNode.kind !== "directory") {
    return fail(ctx, name, `Could not find a part of the path '${display}'.`);
  }

  if (existing?.kind === "file" && existing.readonly) {
    return fail(ctx, name, `Access to the path '${display}' is denied.`);
  }

  await ctx.fs.writeFile(path, value ?? "");
  return ok(createItemListing(path, ctx));
}

const newItem: CommandFn = async (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: ["Force"], params: ["Path", "Name", "ItemType", "Value"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);

  const basePath = parsed.params.Path ?? parsed.positional[0];
  const itemName = parsed.params.Name;
  if (!basePath && !itemName) return fail(ctx, name, "Cannot bind argument to parameter 'Path' because it is null.");

  const nodes = ctx.fs.getNodes();
  const base = resolveShellPath(basePath ?? ".", ctx.session.cwd, nodes);
  const path = itemName ? resolveShellPath(itemName, base, nodes) : base;
  const type = (parsed.params.ItemType ?? "File").toLowerCase();
  const kind = type.startsWith("d") ? "directory" : "file";
  return newItemCore(ctx, name, path, kind, parsed.params.Value, parsed.switches.has("Force"));
};

const makeDirectory: CommandFn = async (args, _stdin, ctx, name) => {
  // mkdir / md, plus Linux muscle memory (mkdir -p).
  const parsed = parseArgs(args.filter((arg) => arg !== "-p"), { switches: ["Force"], params: ["Path", "Name"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  const targets = [...(parsed.params.Path ? [parsed.params.Path] : []), ...parsed.positional];
  if (parsed.params.Name) targets.push(parsed.params.Name);
  if (!targets.length) return fail(ctx, name, "Cannot bind argument to parameter 'Path' because it is null.");

  const out: string[] = [];
  let okay = true;
  for (const target of targets) {
    const result = await newItemCore(
      ctx,
      "New-Item",
      resolveShellPath(target, ctx.session.cwd, ctx.fs.getNodes()),
      "directory",
      undefined,
      parsed.switches.has("Force")
    );
    out.push(...result.out);
    okay &&= result.ok;
  }
  return { out, ok: okay };
};

const touch: CommandFn = async (args, _stdin, ctx, name) => {
  if (!args.length) return fail(ctx, name, "Cannot bind argument to parameter 'Path' because it is null.");
  let okay = true;
  for (const target of args) {
    const nodes = ctx.fs.getNodes();
    const path = resolveShellPath(target, ctx.session.cwd, nodes);
    const existing = nodes[path];
    if (existing?.kind === "file") {
      const text = textContent(existing);
      if (text !== null && !existing.readonly) await ctx.fs.writeFile(path, existing.content as string);
      continue;
    }
    if (existing) continue;
    okay &&= (await newItemCore(ctx, "New-Item", path, "file", "", false)).ok;
  }
  return { out: [], ok: okay };
};

const removeItem: CommandFn = async (args, _stdin, ctx, name) => {
  // rm -rf and friends are accepted; everything goes to the Recycle Bin.
  const unixFlags = args.filter((arg) => /^-[rfRF]+$/.test(arg));
  const parsed = parseArgs(args.filter((arg) => !unixFlags.includes(arg)), { switches: ["Recurse", "Force", "Confirm"], params: ["Path"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  const recurse = parsed.switches.has("Recurse") || unixFlags.some((flag) => /r/i.test(flag));
  const targets = parsed.params.Path ? [parsed.params.Path, ...parsed.positional] : parsed.positional;
  if (!targets.length) return fail(ctx, name, "Cannot bind argument to parameter 'Path' because it is null.");

  let okay = true;
  for (const { path } of expandPaths(targets, ctx)) {
    const nodes = ctx.fs.getNodes();
    const node = nodes[path];
    const display = toDisplayPath(path);

    if (!node) {
      fail(ctx, name, `Cannot find path '${display}' because it does not exist.`);
      okay = false;
      continue;
    }
    if (path === "/" || path === TRASH_PATH) {
      fail(ctx, name, `Cannot remove item ${display}: Access to the path '${display}' is denied.`);
      okay = false;
      continue;
    }
    if (isInside(ctx.session.cwd, path)) {
      fail(ctx, name, `Cannot remove the item at '${display}' because it is in use.`);
      okay = false;
      continue;
    }
    if (node.kind === "directory" && childrenOf(nodes, path).length > 0 && !recurse) {
      fail(ctx, name, `The item at '${display}' has children and the Recurse parameter was not specified.`);
      okay = false;
      continue;
    }
    if (isLocked(nodes, path)) {
      fail(ctx, name, `Cannot remove item ${display}: You do not have sufficient access rights to perform this operation.`);
      okay = false;
      continue;
    }
    await ctx.fs.deleteNode(path);
  }
  return { out: [], ok: okay };
};

async function transfer(args: string[], ctx: Ctx, name: string, operation: "copy" | "cut"): Promise<Output> {
  const unixFlags = args.filter((arg) => /^-[rRfF]+$/.test(arg));
  const parsed = parseArgs(args.filter((arg) => !unixFlags.includes(arg)), {
    switches: ["Recurse", "Force"],
    params: ["Path", "Destination"],
  });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);

  const positional = [...parsed.positional];
  const destinationArg = parsed.params.Destination ?? (positional.length > 1 ? positional.pop() : undefined);
  const sources = parsed.params.Path ? [parsed.params.Path, ...positional] : positional;
  if (!sources.length) return fail(ctx, name, "Cannot bind argument to parameter 'Path' because it is null.");
  if (!destinationArg) return fail(ctx, name, "Cannot bind argument to parameter 'Destination' because it is null.");

  let okay = true;
  const expanded = expandPaths(sources, ctx);

  for (const { path: source } of expanded) {
    const nodes = ctx.fs.getNodes();
    const node = nodes[source];
    if (!node) {
      fail(ctx, name, `Cannot find path '${toDisplayPath(source)}' because it does not exist.`);
      okay = false;
      continue;
    }

    const destination = resolveShellPath(destinationArg, ctx.session.cwd, nodes);
    const destinationNode = nodes[destination];
    let targetDirectory: string;
    let targetName: string;

    if (destinationNode?.kind === "directory") {
      targetDirectory = destination;
      targetName = node.name;
    } else if (destinationNode) {
      if (operation === "copy" && node.kind === "file" && textContent(node) !== null && textContent(destinationNode) !== null && !destinationNode.readonly) {
        // Copy-Item overwrites an existing file.
        await ctx.fs.writeFile(destination, node.content as string);
        continue;
      }
      fail(ctx, name, "Cannot create a file when that file already exists.");
      okay = false;
      continue;
    } else {
      targetDirectory = getParentPath(destination);
      targetName = baseName(destination);
      if (nodes[targetDirectory]?.kind !== "directory") {
        fail(ctx, name, `Could not find a part of the path '${toDisplayPath(destination)}'.`);
        okay = false;
        continue;
      }
    }

    if (node.kind === "directory" && isInside(targetDirectory, source)) {
      fail(ctx, name, `Destination path cannot be a subdirectory of the source: ${toDisplayPath(joinVirtual(targetDirectory, targetName))}.`);
      okay = false;
      continue;
    }

    if (operation === "cut") {
      if (source === "/" || source === TRASH_PATH || isLocked(nodes, source)) {
        fail(ctx, name, `Access to the path '${toDisplayPath(source)}' is denied.`);
        okay = false;
        continue;
      }
      if (isInside(ctx.session.cwd, source)) {
        fail(ctx, name, `Cannot move item because the item at '${toDisplayPath(source)}' is in use.`);
        okay = false;
        continue;
      }
    }

    const collision = findChild(nodes, targetDirectory, targetName);
    if (collision && collision.path !== source) {
      fail(ctx, name, "Cannot create a file when that file already exists.");
      okay = false;
      continue;
    }

    if (operation === "cut" && getParentPath(source) === targetDirectory) {
      if (targetName !== node.name) await ctx.fs.rename(source, targetName);
      continue;
    }

    const before = new Set(Object.keys(nodes));
    await ctx.fs.pasteNode(source, targetDirectory, operation);
    const landed = Object.keys(ctx.fs.getNodes()).find(
      (path) => !before.has(path) && getParentPath(path) === targetDirectory
    );

    if (!landed) {
      fail(ctx, name, `Access to the path '${toDisplayPath(source)}' is denied.`);
      okay = false;
      continue;
    }

    if (baseName(landed) !== targetName) await ctx.fs.rename(landed, targetName);
  }

  return { out: [], ok: okay };
}

const moveItem: CommandFn = (args, _stdin, ctx, name) => transfer(args, ctx, name, "cut");
const copyItem: CommandFn = (args, _stdin, ctx, name) => transfer(args, ctx, name, "copy");

const renameItem: CommandFn = async (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: ["Force"], params: ["Path", "NewName"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  const target = parsed.params.Path ?? parsed.positional[0];
  const nextName = parsed.params.NewName ?? parsed.positional[parsed.params.Path ? 0 : 1];
  if (!target) return fail(ctx, name, "Cannot bind argument to parameter 'Path' because it is null.");
  if (!nextName) return fail(ctx, name, "Cannot bind argument to parameter 'NewName' because it is null.");
  if (/[\\/]/.test(nextName)) return fail(ctx, name, "Cannot rename the specified target, because it represents a path or device name.");

  const nodes = ctx.fs.getNodes();
  const path = resolveShellPath(target, ctx.session.cwd, nodes);
  const node = nodes[path];
  if (!node) return fail(ctx, name, `Cannot rename because item at '${toDisplayPath(path)}' does not exist.`);
  if (path === "/" || path === TRASH_PATH || isLocked(nodes, path)) {
    return fail(ctx, name, `Access to the path '${toDisplayPath(path)}' is denied.`);
  }
  const collision = findChild(nodes, getParentPath(path), nextName);
  if (collision && collision.path !== path) return fail(ctx, name, "Cannot create a file when that file already exists.");

  const renamed = await ctx.fs.rename(path, nextName);
  if (isInside(ctx.session.cwd, path)) ctx.session.cwd = renamed + ctx.session.cwd.slice(path.length);
  return ok();
};

async function writeContent(ctx: Ctx, name: string, target: string, lines: string[], append: boolean): Promise<Output> {
  const nodes = ctx.fs.getNodes();
  const path = resolveShellPath(target, ctx.session.cwd, nodes);
  const display = toDisplayPath(path);
  const node = nodes[path];

  if (node?.kind === "directory" || (node?.kind === "file" && node.readonly)) {
    return fail(ctx, name, `Access to the path '${display}' is denied.`);
  }
  if (node && textContent(node) === null) {
    return fail(ctx, name, `Access to the path '${display}' is denied.`);
  }
  if (nodes[getParentPath(path)]?.kind !== "directory") {
    return fail(ctx, name, `Could not find a part of the path '${display}'.`);
  }

  const text = lines.map(stripAnsi).join("\n");
  const existing = node ? (node.content as string) : "";
  const next = append && existing ? `${existing}${existing.endsWith("\n") ? "" : "\n"}${text}` : text;
  await ctx.fs.writeFile(path, next);
  return ok();
}

const setContent: CommandFn = (args, stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: ["Force"], params: ["Path", "Value"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  const target = parsed.params.Path ?? parsed.positional.shift();
  if (!target) return fail(ctx, name, "Cannot bind argument to parameter 'Path' because it is null.");
  const values = parsed.params.Value !== undefined ? [parsed.params.Value] : parsed.positional.length ? parsed.positional : stdin ?? [];
  return writeContent(ctx, name, target, values, name === "Add-Content");
};

const outFile: CommandFn = (args, stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: ["Append", "Force"], params: ["FilePath", "Path"] });
  const target = parsed.params.FilePath ?? parsed.params.Path ?? parsed.positional[0];
  if (!target) return fail(ctx, name, "Cannot bind argument to parameter 'FilePath' because it is null.");
  return writeContent(ctx, name, target, stdin ?? [], parsed.switches.has("Append"));
};

const writeOutput: CommandFn = (args, stdin) => ok([...(stdin ?? []), ...args]);

const clearHost: CommandFn = (_args, _stdin, ctx) => {
  ctx.clear = true;
  ctx.lines.length = 0;
  return ok();
};

const getHistory: CommandFn = (_args, _stdin, ctx) => {
  if (!ctx.session.history.length) return ok();
  const width = String(ctx.session.history.length).length + 3;
  return ok([
    "",
    `${TABLE}${"Id".padStart(width)} CommandLine${RESET}`,
    `${TABLE}${"--".padStart(width)} -----------${RESET}`,
    ...ctx.session.history.map((entry, index) => `${String(index + 1).padStart(width)} ${sanitizeForTerminal(entry)}`),
    "",
  ]);
};

const startProcess: CommandFn = async (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { params: ["FilePath", "ArgumentList", "Path"] });
  const target = parsed.params.FilePath ?? parsed.params.Path ?? parsed.positional[0];
  const rest = parsed.params.ArgumentList ? [parsed.params.ArgumentList] : parsed.positional.slice(1);

  if (!target) return fail(ctx, name, "Cannot bind argument to parameter 'FilePath' because it is null.");

  if (/^ms-settings:/i.test(target)) return openSettingsUri(target, ctx);
  if (isUrl(target)) return launchExecutable("msedge", [target], ctx);

  const executable = target.toLowerCase().replace(/\.exe$/, "");
  if (own(EXECUTABLES, executable)) return launchExecutable(executable, rest, ctx);

  const nodes = ctx.fs.getNodes();
  const path = resolveShellPath(target, ctx.session.cwd, nodes);
  if (nodes[path]) {
    ctx.actions.push({ type: "open-path", path });
    return ok();
  }

  const shortcut = own(PATH_SHORTCUTS, target.toLowerCase());
  if (shortcut && nodes[shortcut]) {
    ctx.actions.push({ type: "open-path", path: shortcut });
    return ok();
  }

  const project = findProject(target);
  if (project) {
    ctx.actions.push({ type: "launch-app", appId: "projects", payload: { projectId: project.id } });
    return ok();
  }

  return fail(ctx, name, "This command cannot be run due to the error: The system cannot find the file specified.");
};

function treeLines(nodes: FileSystemRecord, directory: string, prefix: string, showFiles: boolean, ascii: boolean): string[] {
  const glyph = ascii
    ? { branch: "+---", last: "\\---", pipe: "|   ", pipeEnd: "|" }
    : { branch: "├───", last: "└───", pipe: "│   ", pipeEnd: "│" };
  const children = childrenOf(nodes, directory).filter((node) => node.path !== TRASH_PATH);
  const directories = children.filter((node) => node.kind === "directory");
  const files = children.filter((node) => node.kind === "file");
  const lines: string[] = [];

  if (showFiles && files.length) {
    files.forEach((file) => lines.push(`${prefix}${directories.length ? glyph.pipe : "    "}${sanitizeForTerminal(file.name)}`));
    lines.push(`${prefix}${directories.length ? glyph.pipeEnd : ""}`.trimEnd());
  }

  directories.forEach((node, index) => {
    const last = index === directories.length - 1;
    lines.push(`${prefix}${last ? glyph.last : glyph.branch}${sanitizeForTerminal(node.name)}`);
    lines.push(...treeLines(nodes, node.path, `${prefix}${last ? "    " : glyph.pipe}`, showFiles, ascii));
  });

  return lines;
}

const tree: CommandFn = (args, _stdin, ctx, name) => {
  // tree.com switches are single letters (/F, /A); anything longer is a path, even /Portfolio.
  const isSwitch = (arg: string) => /^[/][a-z]$/i.test(arg);
  const switches = args.filter(isSwitch).map((arg) => arg.toUpperCase());
  const target = args.find((arg) => !isSwitch(arg));
  const nodes = ctx.fs.getNodes();
  const path = target ? resolveShellPath(target, ctx.session.cwd, nodes) : ctx.session.cwd;
  const node = nodes[path];
  if (!node || node.kind !== "directory") return fail(ctx, name, `Invalid path - ${toDisplayPath(path).toUpperCase()}`);

  const body = treeLines(nodes, path, "", switches.includes("/F"), switches.includes("/A"));
  const hasFolders = childrenOf(nodes, path).some((child) => child.kind === "directory" && child.path !== TRASH_PATH);
  return ok([
    "Folder PATH listing for volume Taaniel OS",
    "Volume serial number is 7A1C-3E5D",
    toDisplayPath(path).toUpperCase(),
    ...body,
    ...(hasFolders ? [] : ["No subfolders exist", ""]),
  ]);
};

const selectString: CommandFn = (args, stdin, ctx, name) => {
  // grep-style flags are accepted alongside the PowerShell ones.
  const invert = args.includes("-v");
  const parsed = parseArgs(args.filter((arg) => !["-v", "-i", "-n", "-r"].includes(arg)), {
    switches: ["SimpleMatch", "CaseSensitive", "NotMatch", "Quiet"],
    params: ["Pattern", "Path"],
  });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);

  const positional = [...parsed.positional];
  const pattern = parsed.params.Pattern ?? positional.shift();
  if (!pattern) return fail(ctx, name, "Missing an argument for parameter 'Pattern'. Specify a parameter of type 'System.String[]' and try again.");
  const paths = parsed.params.Path ? [parsed.params.Path, ...positional] : positional;
  const notMatch = invert || parsed.switches.has("NotMatch");
  const matcher = buildMatcher(pattern, parsed.switches.has("SimpleMatch"), parsed.switches.has("CaseSensitive"));
  const test = (line: string) => {
    matcher.lastIndex = 0;
    const hit = matcher.test(line);
    matcher.lastIndex = 0;
    return notMatch ? !hit : hit;
  };
  const render = (line: string) => (notMatch ? line : highlight(line, matcher));
  const out: string[] = [];

  if (paths.length) {
    const nodes = ctx.fs.getNodes();
    for (const { path } of expandPaths(paths, ctx)) {
      const node = nodes[path];
      if (!node) {
        fail(ctx, name, `Cannot find path '${toDisplayPath(path)}' because it does not exist.`);
        continue;
      }
      const files = node.kind === "directory" ? childrenOf(nodes, path).filter((child) => child.kind === "file") : [node];
      for (const file of files) {
        const text = textContent(file);
        if (text === null) continue;
        sanitizeForTerminal(text).split("\n").forEach((line, index) => {
          if (test(line)) out.push(`${displayRelative(file.path, ctx.session.cwd)}:${index + 1}:${render(line)}`);
        });
      }
    }
  } else if (stdin) {
    stdin.forEach((line) => {
      if (test(line)) out.push(render(line));
    });
  }

  if (parsed.switches.has("Quiet")) return ok([out.length ? "True" : "False"]);
  return ok(out);
};

// ------------------------------------------------ object pipeline cmdlets

/** What the previous stage handed over: its objects, or its text lines as strings. Capped. */
function pipelineItems(stdin: string[] | null, ctx: Ctx): PipelineItem[] {
  const items: PipelineItem[] = ctx.input ?? stdin ?? [];
  return items.length > MAX_PIPELINE_ITEMS ? items.slice(0, MAX_PIPELINE_ITEMS) : items;
}

const hasObjects = (ctx: Ctx) => ctx.input !== null;

/** Hand items to the next stage as objects, printing them the way PowerShell would by default. */
function emitItems(items: PipelineItem[]): Output {
  return { out: renderItems(items), ok: true, objects: items };
}

/** Parse a { script block } once; it then runs per item with $_ bound to that item. */
function compileBlock(block: string, ctx: Ctx, name: string): ExprNode | null {
  const parsed = parseExpression(block.slice(1, -1).trim());
  if (!parsed) {
    fail(
      ctx,
      name,
      "Script blocks here run a single expression, for example { $_.Length -gt 1kb -and $_.Name -like '*.md' }. Commands and several statements are not supported."
    );
    return null;
  }
  if ("error" in parsed) {
    fail(ctx, name, parsed.error);
    return null;
  }
  return parsed.node;
}

/** Run a cmdlet body, reporting an expression error the way PowerShell reports a runtime one. */
function guardExpressions(ctx: Ctx, name: string, body: () => Output): Output {
  try {
    return body();
  } catch (error) {
    if (error instanceof ExpressionError) return fail(ctx, name, error.message);
    throw error;
  }
}

/** Property names from -Property and positional arguments, keeping any { script block } whole. */
function propertySpecs(parsed: ParsedArgs) {
  const raw = [...(parsed.params.Property !== undefined ? [parsed.params.Property] : []), ...parsed.positional];
  return raw.flatMap((entry) => (isScriptBlock(entry) ? [entry] : splitPropertyList([entry])));
}

const WHERE_OPERATORS: Record<string, string> = {
  EQ: "-eq",
  NE: "-ne",
  GT: "-gt",
  GE: "-ge",
  LT: "-lt",
  LE: "-le",
  Like: "-like",
  NotLike: "-notlike",
  Match: "-match",
  NotMatch: "-notmatch",
  Contains: "-contains",
  NotContains: "-notcontains",
  In: "-in",
  NotIn: "-notin",
};

/** The value typed after -gt and friends, read as a number (1kb) or a date when the property is one. */
function coerceOperand(left: ShellValue, raw: PropertyValue | undefined, value: string): ShellValue {
  if (typeof left === "number") return parseSizeLiteral(value) ?? value;
  if (isShellDate(raw)) {
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : value;
  }
  return value;
}

const whereObject: CommandFn = (args, stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: Object.keys(WHERE_OPERATORS), params: ["Property", "Value", "FilterScript"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  const items = pipelineItems(stdin, ctx);
  const block = parsed.params.FilterScript ?? parsed.positional.find(isScriptBlock);
  const env = expressionEnv(ctx);

  return guardExpressions(ctx, name, () => {
    if (block) {
      const node = compileBlock(block, ctx, name);
      if (!node) return { out: [], ok: false };
      return emitItems(items.filter((item) => toBool(evaluateNode(node, env, { item }))));
    }

    const property = parsed.params.Property ?? parsed.positional[0];
    if (!property) return fail(ctx, name, "Cannot bind argument to parameter 'FilterScript' because it is null.");
    const operator = Object.entries(WHERE_OPERATORS).find(([key]) => parsed.switches.has(key))?.[1];
    const value = parsed.params.Value ?? (parsed.params.Property !== undefined ? parsed.positional[0] : parsed.positional[1]);
    if (operator && value === undefined) {
      return fail(ctx, name, "Missing an argument for parameter 'Value'. Specify a parameter of type 'System.Object' and try again.");
    }

    return emitItems(
      items.filter((item) => {
        const raw = getProperty(item, property);
        const left = propertyToShellValue(raw);
        if (!operator) return toBool(left);
        return toBool(compareOperands(operator, left, coerceOperand(left, raw, value as string)));
      })
    );
  });
};

const forEachObject: CommandFn = (args, stdin, ctx, name) => {
  const parsed = parseArgs(args, { params: ["Process", "MemberName"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  const items = pipelineItems(stdin, ctx);
  const block = parsed.params.Process ?? parsed.positional.find(isScriptBlock);
  const member = parsed.params.MemberName ?? (block ? undefined : parsed.positional[0]);
  if (!block && !member) return fail(ctx, name, "Cannot bind argument to parameter 'Process' because it is null.");
  const env = expressionEnv(ctx);

  return guardExpressions(ctx, name, () => {
    const results: PipelineItem[] = [];
    const node = block ? compileBlock(block, ctx, name) : null;
    if (block && !node) return { out: [], ok: false };

    for (const item of items) {
      if (results.length >= MAX_PIPELINE_ITEMS) break;
      if (node) {
        if (isBareItemNode(node)) {
          results.push(item);
          continue;
        }
        const value = evaluateNode(node, env, { item });
        if (Array.isArray(value)) results.push(...value.slice(0, MAX_PIPELINE_ITEMS - results.length));
        else results.push(value);
      } else {
        results.push(formatPropertyValue(getProperty(item, member as string)));
      }
    }
    return emitItems(results);
  });
};

const sortObject: CommandFn = (args, stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: ["Descending", "Unique", "CaseSensitive"], params: ["Property"] });
  const specs = propertySpecs(parsed);

  // Text in, text out: the original line sort, which drops blank lines.
  if (!hasObjects(ctx) && !specs.length) {
    let lines = [...(stdin ?? [])].filter((line) => line.trim().length > 0);
    lines.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: parsed.switches.has("CaseSensitive") ? "case" : "base" }));
    if (parsed.switches.has("Descending")) lines.reverse();
    if (parsed.switches.has("Unique")) lines = lines.filter((line, index) => lines.findIndex((other) => other.toLowerCase() === line.toLowerCase()) === index);
    return ok(lines);
  }

  const items = pipelineItems(stdin, ctx);
  const env = expressionEnv(ctx);

  return guardExpressions(ctx, name, () => {
    const compiled: Array<{ property?: string; node?: ExprNode }> = [];
    for (const spec of specs) {
      if (!isScriptBlock(spec)) {
        compiled.push({ property: spec });
        continue;
      }
      const node = compileBlock(spec, ctx, name);
      if (!node) return { out: [], ok: false };
      compiled.push({ node });
    }
    if (!compiled.length) compiled.push({});

    const keyOf = (item: PipelineItem, key: { property?: string; node?: ExprNode }): PropertyValue => {
      if (key.node) {
        const value = evaluateNode(key.node, env, { item });
        return Array.isArray(value) ? value.join(" ") : value;
      }
      if (key.property) return getProperty(item, key.property) ?? null;
      return isShellObject(item) ? item.text : item;
    };

    const keys = items.map((item) => compiled.map((key) => keyOf(item, key)));
    const direction = parsed.switches.has("Descending") ? -1 : 1;
    const order = items
      .map((_, index) => index)
      .sort((a, b) => {
        for (let column = 0; column < compiled.length; column += 1) {
          const difference = compareProperties(keys[a][column], keys[b][column]);
          if (difference !== 0) return difference * direction;
        }
        return a - b;
      });

    let sorted = order.map((index) => ({ item: items[index], key: keys[index] }));
    if (parsed.switches.has("Unique")) {
      const seen = new Set<string>();
      sorted = sorted.filter(({ key }) => {
        const signature = key.map((value) => formatPropertyValue(value).toLowerCase()).join("\u0000");
        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
      });
    }
    return emitItems(sorted.map((entry) => entry.item));
  });
};

const selectObject: CommandFn = (args, stdin, ctx) => {
  const parsed = parseArgs(args, { switches: ["Unique"], params: ["First", "Last", "Skip", "Property", "ExpandProperty"] });
  const properties = splitPropertyList([...(parsed.params.Property !== undefined ? [parsed.params.Property] : []), ...parsed.positional]);
  const expand = parsed.params.ExpandProperty;
  const skip = Number(parsed.params.Skip);
  const first = Number(parsed.params.First);
  const last = Number(parsed.params.Last);

  const slice = <T,>(list: T[]) => {
    let result = list;
    if (Number.isFinite(skip)) result = result.slice(skip);
    if (Number.isFinite(first)) result = result.slice(0, first);
    if (Number.isFinite(last)) result = last === 0 ? [] : result.slice(-last);
    return result;
  };

  // Text in, text out: first, last and skip over lines.
  if (!hasObjects(ctx) && !properties.length && expand === undefined) return ok(slice([...(stdin ?? [])]));

  let items = slice(pipelineItems(stdin, ctx));
  if (parsed.switches.has("Unique")) {
    const seen = new Set<string>();
    items = items.filter((item) => {
      const signature = itemText(item).toLowerCase();
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    });
  }

  if (expand !== undefined) {
    const values: PipelineItem[] = [];
    for (const item of items) {
      const value = getProperty(item, expand);
      if (value === null || value === undefined) continue;
      values.push(typeof value === "string" || typeof value === "number" || typeof value === "boolean" || isShellObject(value) ? value : formatPropertyValue(value));
    }
    return emitItems(values);
  }

  return emitItems(properties.length ? selectProperties(items, properties) : items);
};

const measureObject: CommandFn = (args, stdin, ctx) => {
  const parsed = parseArgs(args, { switches: ["Line", "Word", "Character", "Sum", "Average", "Maximum", "Minimum"], params: ["Property"] });
  const property = parsed.params.Property ?? parsed.positional[0];
  const textMode = parsed.switches.has("Line") || parsed.switches.has("Word") || parsed.switches.has("Character");
  const stats = ["Sum", "Average", "Maximum", "Minimum"].some((entry) => parsed.switches.has(entry));

  if (textMode || (!hasObjects(ctx) && !property && !stats)) {
    const lines = (stdin ?? []).filter((line) => line.length > 0);
    if (textMode) {
      const words = lines.reduce((sum, line) => sum + line.split(/\s+/).filter(Boolean).length, 0);
      const characters = lines.reduce((sum, line) => sum + line.length, 0);
      return ok([
        "",
        `${TABLE}Lines Words Characters${RESET}`,
        `${TABLE}----- ----- ----------${RESET}`,
        `${String(lines.length).padStart(5)} ${String(words).padStart(5)} ${String(characters).padStart(10)}`,
        "",
      ]);
    }
    return ok(["", `Count    : ${lines.length}`, ""]);
  }

  const items = pipelineItems(stdin, ctx);
  const values = property ? items.map((item) => getProperty(item, property)).filter((value) => value !== null && value !== undefined) : items;
  const numbers = values.filter((value): value is number => typeof value === "number");
  const total = numbers.reduce((sum, value) => sum + value, 0);
  const row = (label: string, value: string | number) => `${label.padEnd(17)} : ${value}`;
  const stat = (switchName: string, compute: () => number) => (parsed.switches.has(switchName) && numbers.length ? formatPropertyValue(compute()) : "");

  return ok([
    "",
    row("Count", values.length),
    row("Average", stat("Average", () => total / numbers.length)),
    row("Sum", stat("Sum", () => total)),
    row("Maximum", stat("Maximum", () => Math.max(...numbers))),
    row("Minimum", stat("Minimum", () => Math.min(...numbers))),
    row("StandardDeviation", ""),
    row("Property", property ?? ""),
    "",
  ]);
};

/** Format-Table and Format-List: with -Property they pick columns; without, they show each kind of object its usual way. */
function formatCmdlet(layout: "table" | "list"): CommandFn {
  return (args, stdin, ctx, name) => {
    const parsed = parseArgs(args, { switches: ["AutoSize", "Wrap", "HideTableHeaders", "Force"], params: ["Property", "GroupBy"] });
    if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
    const items = pipelineItems(stdin, ctx);
    const properties = splitPropertyList([...(parsed.params.Property !== undefined ? [parsed.params.Property] : []), ...parsed.positional]);

    if (!items.some(isShellObject)) return ok(items.map(itemText));
    if (properties.length) {
      return ok(layout === "table" ? formatTableView(items, properties) : formatListView(items, properties));
    }
    return ok(renderItems(items, layout));
  };
}

const formatTableCmdlet = formatCmdlet("table");
const formatListCmdlet = formatCmdlet("list");

/** Text given as an argument, or else the piped lines, for the cmdlets that take an InputObject. */
function inputText(parsed: ParsedArgs, stdin: string[] | null) {
  const given = parsed.params.InputObject !== undefined ? [parsed.params.InputObject, ...parsed.positional] : parsed.positional;
  return given.length ? given.join(" ") : (stdin ?? []).join("\n");
}

const convertToJson: CommandFn = (args, stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: ["Compress", "AsArray", "EnumsAsStrings"], params: ["Depth", "InputObject"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  const depth = parsed.params.Depth === undefined ? DEFAULT_JSON_DEPTH : Number(parsed.params.Depth);
  if (!Number.isInteger(depth) || depth < 0 || depth > MAX_JSON_DEPTH) {
    return fail(ctx, name, `Cannot validate argument on parameter 'Depth'. The ${parsed.params.Depth} argument is not in the valid range of 0 to ${MAX_JSON_DEPTH}.`);
  }
  const given = parsed.params.InputObject !== undefined ? [parsed.params.InputObject, ...parsed.positional] : parsed.positional;
  const items: PipelineItem[] = given.length ? given : pipelineItems(stdin, ctx);
  if (!items.length) return fail(ctx, name, "Cannot bind argument to parameter 'InputObject' because it is null.");
  return ok(itemsToJson(items, { depth, compress: parsed.switches.has("Compress"), asArray: parsed.switches.has("AsArray") }).split("\n"));
};

const convertFromJson: CommandFn = (args, stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: ["AsHashtable", "NoEnumerate"], params: ["InputObject", "Depth"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  const text = inputText(parsed, stdin).trim();
  if (!text) return fail(ctx, name, "Cannot bind argument to parameter 'InputObject' because it is an empty string.");
  const result = jsonToItems(text);
  if ("error" in result) return fail(ctx, name, result.error);
  return emitItems(result.items);
};

const getDate: CommandFn = () =>
  ok(["", new Intl.DateTimeFormat([], { dateStyle: "full", timeStyle: "medium" }).format(new Date()), ""]);

const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

const newGuid: CommandFn = (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: ["Empty"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  const guid = parsed.switches.has("Empty") ? EMPTY_GUID : globalThis.crypto?.randomUUID?.();
  if (!guid) return fail(ctx, name, "Cryptography is not available in this browser.");
  // Printed as a one-column table; a variable (and a string) gets just the value.
  return emitItems([createObject("System.Guid", { Guid: guid }, guid, { view: "scalar" })]);
};

/** A .NET TimeSpan as it prints: [d.]hh:mm:ss.fffffff */
function timeSpanText(milliseconds: number) {
  const ticks = Math.round(milliseconds * 10_000);
  const pad = (value: number, width = 2) => String(value).padStart(width, "0");
  const days = Math.floor(ticks / 864_000_000_000);
  const hours = Math.floor(ticks / 36_000_000_000) % 24;
  const minutes = Math.floor(ticks / 600_000_000) % 60;
  const seconds = Math.floor(ticks / 10_000_000) % 60;
  return `${days > 0 ? `${days}.` : ""}${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(ticks % 10_000_000, 7)}`;
}

/** The time this page has been open, as a TimeSpan object: a browser has no boot time to report. */
function uptimeObject(milliseconds: number): ShellObject {
  const total = (divisor: number) => Number((milliseconds / divisor).toPrecision(15));
  return createObject(
    "System.TimeSpan",
    {
      Days: Math.floor(milliseconds / 86_400_000),
      Hours: Math.floor(milliseconds / 3_600_000) % 24,
      Minutes: Math.floor(milliseconds / 60_000) % 60,
      Seconds: Math.floor(milliseconds / 1000) % 60,
      Milliseconds: Math.floor(milliseconds) % 1000,
      Ticks: Math.round(milliseconds * 10_000),
      TotalDays: total(86_400_000),
      TotalHours: total(3_600_000),
      TotalMinutes: total(60_000),
      TotalSeconds: total(1000),
      TotalMilliseconds: Number(milliseconds.toFixed(4)),
    },
    timeSpanText(milliseconds)
  );
}

const getUptime: CommandFn = (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: ["Since"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  const elapsed = Math.max(0, globalThis.performance?.now?.() ?? 0);
  if (parsed.switches.has("Since")) {
    return ok(["", new Intl.DateTimeFormat([], { dateStyle: "full", timeStyle: "medium" }).format(new Date(Date.now() - elapsed)), ""]);
  }
  return emitItems([uptimeObject(elapsed)]);
};

const getHost: CommandFn = () => emitItems([hostObject()]);

/** Get-PSReadLineKeyHandler: the keys the line editor answers to, in PSReadLine's grouped layout. */
const getKeyHandler: CommandFn = (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: ["Bound", "Unbound"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  // Everything the editor can do is bound to a key.
  if (parsed.switches.has("Unbound") && !parsed.switches.has("Bound")) return ok();

  const out: string[] = [];
  for (const group of READLINE_KEY_HANDLERS) {
    const keyWidth = Math.max(3, ...group.handlers.map((handler) => handler.key.length)) + 1;
    const functionWidth = Math.max(8, ...group.handlers.map((handler) => handler.function.length)) + 1;
    out.push(
      "",
      `${TABLE}${group.title}${RESET}`,
      `${TABLE}${"=".repeat(group.title.length)}${RESET}`,
      "",
      `${TABLE}${"Key".padEnd(keyWidth)}${"Function".padEnd(functionWidth)}Description${RESET}`,
      `${TABLE}${"---".padEnd(keyWidth)}${"--------".padEnd(functionWidth)}-----------${RESET}`,
      ...group.handlers.map((handler) => `${handler.key.padEnd(keyWidth)}${handler.function.padEnd(functionWidth)}${handler.description}`)
    );
  }
  out.push("");
  return ok(out);
};

/**
 * Invoke-Expression runs text as a command line through this same interpreter, one
 * level deeper, never through JavaScript. The script depth limit stops `iex` from
 * calling itself for ever.
 */
const invokeExpression: CommandFn = async (args, stdin, ctx, name) => {
  if (ctx.depth >= MAX_SCRIPT_DEPTH) return fail(ctx, name, "The script failed due to call depth overflow.");
  const parsed = parseArgs(args, { params: ["Command"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);

  const typed = (parsed.params.Command !== undefined ? [parsed.params.Command, ...parsed.positional] : parsed.positional).join(" ");
  const sources = typed.trim() ? [typed] : (stdin ?? []).filter((line) => line.trim() !== "");
  if (!sources.length) return fail(ctx, name, "Cannot bind argument to parameter 'Command' because it is an empty string.");

  const out: string[] = [];
  let okay = true;
  for (const source of sources) {
    checkInterrupt(ctx);
    // eslint-disable-next-line no-await-in-loop
    const result = await runShellCommand(source, ctx.session, ctx.fs, ctx.host, ctx.depth + 1);
    if (result.interrupted) throw new InterruptedError("The command was interrupted.");
    if (result.clear) {
      ctx.clear = true;
      out.length = 0;
    }
    out.push(...result.lines);
    ctx.actions.push(...result.actions);
    okay &&= result.success;
  }
  return { out, ok: okay };
};

const neofetch: CommandFn = () =>
  ok([
    "   \\  |  /      taaniel@TAANIEL-OS",
    "    \\ | /       ------------------",
    "     \\|/        OS: Taaniel OS 11",
    "   -------      Shell: PowerShell 7.4.5",
    "                Terminal: Taaniel Terminal",
    `                Resolution: ${globalThis.innerWidth ?? 0}x${globalThis.innerHeight ?? 0}`,
    "                Kernel: your browser",
    "                Uptime: since you got here",
  ]);

const cowsay: CommandFn = (args, stdin) => {
  const text = sanitizeForTerminal((args.length ? args.join(" ") : (stdin ?? []).join(" ")) || "moo").slice(0, 60);
  return ok([` ${"_".repeat(text.length + 2)}`, `< ${text} >`, ` ${"-".repeat(text.length + 2)}`, "        \\   ^__^", "         \\  (oo)\\_______", "            (__)\\       )\\/\\", "                ||----w |", "                ||     ||"]);
};

const sudo: CommandFn = (_args, _stdin, ctx) => {
  ctx.actions.push({ type: "achievement", id: "sudo" });
  return ok(["taaniel is not in the sudoers file. This incident will be reported."]);
};

const matrix: CommandFn = (_args, _stdin, ctx) => {
  ctx.actions.push({ type: "achievement", id: "matrix" });
  const glyphs = "01アイウエオカキクケコサシスセソタチツテト";
  const lines = Array.from({ length: 14 }, () =>
    Array.from({ length: 64 }, () => (Math.random() < 0.35 ? glyphs[Math.floor(Math.random() * glyphs.length)] : " ")).join("")
  );
  return ok([...lines.map((line) => `\x1b[32m${line}\x1b[0m`), "Wake up, visitor..."]);
};

const whoami: CommandFn = () => ok([`${SHELL_HOST.toLowerCase()}\\${SHELL_USER.toLowerCase()}`]);
const hostname: CommandFn = () => ok([SHELL_HOST]);

const exitShell: CommandFn = (_args, _stdin, ctx) => {
  ctx.actions.push({ type: "exit" });
  return ok();
};

// ------------------------------------------------------- portfolio commands

function findProject(input: string) {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;
  return (
    featuredProjects.find((project) => project.id.toLowerCase() === normalized) ??
    featuredProjects.find((project) => project.title.toLowerCase() === normalized) ??
    null
  );
}

const about: CommandFn = (_args, _stdin, ctx) => {
  ctx.actions.push({ type: "launch-app", appId: "about" });
  return ok([
    `${profile.name} - ${profile.role}`,
    profile.headline,
    `Location: ${profile.location}`,
    `Availability: ${profile.availability}`,
  ]);
};

const projects: CommandFn = (args, _stdin, ctx, name) => {
  const target = args.join(" ").trim();
  if (target) {
    const project =
      findProject(target) ??
      featuredProjects.find((entry) => entry.title.toLowerCase().includes(target.toLowerCase())) ??
      null;
    if (!project) return fail(ctx, name, `No project matches '${target}'. Run 'projects' to list them.`);
    ctx.actions.push({ type: "launch-app", appId: "projects", payload: { projectId: project.id } });
    return ok([`Opening ${project.title}`, project.oneLiner]);
  }

  ctx.actions.push({ type: "launch-app", appId: "projects" });
  return ok([
    "",
    `${TABLE}Id${" ".repeat(18)}Title${RESET}`,
    `${TABLE}--${" ".repeat(18)}-----${RESET}`,
    ...featuredProjects.map((project) => `${project.id.padEnd(20)}${project.title}`),
    "",
    "Open one with: projects <id>",
  ]);
};

const contact: CommandFn = (_args, _stdin, ctx) => {
  ctx.actions.push({ type: "launch-app", appId: "contact" });
  return ok([
    `Email    : ${profile.emailText}`,
    `Phone    : ${profile.phoneText}`,
    `Location : ${profile.location}`,
    ...socialLinks.map((link) => `${link.label.padEnd(9)}: ${link.url}`),
  ]);
};

const resume: CommandFn = (_args, _stdin, ctx) => {
  ctx.actions.push({ type: "open-path", path: PATH_SHORTCUTS.resume });
  return ok();
};

// ------------------------------------------------------------- expressions

/*
 * The evaluator lives in terminal-expression.ts (no eval, no Function). Here it
 * is wired to the session: variables, $env:, and the work budget of one command.
 */

function expressionEnv(ctx: Ctx): ExpressionEnv {
  return { readVariable: (name) => readVariable(name, ctx), budget: ctx.budget };
}

/** Evaluate a whole line as an expression. Returns undefined when it is not one (so it runs as a command). */
function evaluateExpression(text: string, ctx: Ctx): { value: ShellValue } | { error: string } | undefined {
  const parsed = parseExpression(text);
  if (!parsed) return undefined;
  if ("error" in parsed) return parsed;
  try {
    return { value: evaluateNode(parsed.node, expressionEnv(ctx)) };
  } catch (error) {
    if (error instanceof ExpressionError) return { error: error.message };
    return undefined;
  }
}

function formatValue(value: ShellValue): string[] {
  if (Array.isArray(value)) return value;
  return [toText(value)];
}

const PS_VERSION_TABLE = (): string[] => [
  "",
  `${TABLE}${"Name".padEnd(31)}Value${RESET}`,
  `${TABLE}${"----".padEnd(31)}-----${RESET}`,
  ...psVersionRows().map(([name, value]) => `${name.padEnd(31)}${formatPropertyValue(value)}`),
  "",
];

/**
 * `$PSVersionTable.PSVersion`: an object reached through member access prints
 * the way PowerShell shows it. Other member chains ($PWD.Path, $Host.Version,
 * $PSVersionTable.PSEdition) are plain values and take the expression path.
 */
const VARIABLE_MEMBERS = /^\$((?:env:)?[A-Za-z_][A-Za-z0-9_]*)((?:\.[A-Za-z_][A-Za-z0-9_]*)+)$/i;

function memberObject(text: string, ctx: Ctx): ShellObject | null {
  const match = VARIABLE_MEMBERS.exec(text);
  if (!match) return null;
  let value: unknown = readVariable(match[1], ctx);
  for (const member of match[2].split(".").filter(Boolean)) {
    value = isShellObject(value) ? getProperty(value, member) : undefined;
  }
  return isShellObject(value) ? value : null;
}

// ---------------------------------------------------------- host commands

const CONSOLE_COLORS: Record<string, string> = {
  black: "30",
  darkblue: "34",
  darkgreen: "32",
  darkcyan: "36",
  darkred: "31",
  darkmagenta: "35",
  darkyellow: "33",
  gray: "37",
  darkgray: "90",
  blue: "94",
  green: "92",
  cyan: "96",
  red: "91",
  magenta: "95",
  yellow: "93",
  white: "97",
};

const writeHost: CommandFn = (args, stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: ["NoNewline"], params: ["ForegroundColor", "BackgroundColor", "Object", "Separator"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  const fg = parsed.params.ForegroundColor ? own(CONSOLE_COLORS, parsed.params.ForegroundColor.toLowerCase()) : undefined;
  const bgCode = parsed.params.BackgroundColor ? own(CONSOLE_COLORS, parsed.params.BackgroundColor.toLowerCase()) : undefined;
  if (parsed.params.ForegroundColor && !fg) {
    return fail(ctx, name, `Cannot bind parameter 'ForegroundColor'. Cannot convert value "${parsed.params.ForegroundColor}" to type "System.ConsoleColor".`);
  }
  const bg = bgCode ? String(Number(bgCode) + 10) : undefined;
  const text = [...(parsed.params.Object ? [parsed.params.Object] : []), ...parsed.positional, ...(stdin ?? [])].join(parsed.params.Separator ?? " ");
  const codes = [fg, bg].filter(Boolean).join(";");
  return ok([codes ? `${CSI}${codes}m${text}${RESET}` : text]);
};

/** A stable, PowerShell-looking numeric id for an OS process. */
export function processNumber(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return 1000 + (hash % 9000);
}

/** An app as the objects Get-Process hands down a pipeline. */
function processObject(process: ShellProcessInfo): ShellObject {
  return createObject(
    "System.Diagnostics.Process",
    {
      Id: processNumber(process.id),
      ProcessName: sanitizeForTerminal(process.name),
      Name: sanitizeForTerminal(process.name),
      Status: process.minimized ? "Minimized" : "Running",
      Responding: true,
      MainWindowTitle: sanitizeForTerminal(process.title),
    },
    `System.Diagnostics.Process (${sanitizeForTerminal(process.name)})`,
    { view: "process" }
  );
}

const getProcess: CommandFn = (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { params: ["Name", "Id"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  const processes = ctx.host.listProcesses?.() ?? [];
  const nameFilter = parsed.params.Name ?? parsed.positional[0];
  const idFilter = parsed.params.Id ? Number(parsed.params.Id) : undefined;
  const matches = processes.filter((process) => {
    if (idFilter !== undefined && processNumber(process.id) !== idFilter) return false;
    if (nameFilter && !wildcardRegex(nameFilter).test(process.name)) return false;
    return true;
  });

  if (matches.length === 0) {
    if (idFilter !== undefined) return fail(ctx, name, `Cannot find a process with the process identifier ${idFilter}.`);
    if (nameFilter) return fail(ctx, name, `Cannot find a process with the name "${nameFilter}". Verify the process name and call the cmdlet again.`);
    return ok();
  }

  const objects = matches.map(processObject);
  return { out: formatProcessObjects(objects), ok: true, objects };
};

const stopProcess: CommandFn = (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: ["Force"], params: ["Name", "Id"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  const processes = ctx.host.listProcesses?.() ?? [];
  const positional = parsed.positional[0];
  const idValue = parsed.params.Id ?? (positional && /^\d+$/.test(positional) ? positional : undefined);
  const nameValue = parsed.params.Name ?? (idValue === undefined ? positional : undefined);

  if (idValue === undefined && !nameValue) return fail(ctx, name, "Cannot bind argument to parameter 'Id' because it is null.");

  const targets = processes.filter((process) =>
    idValue !== undefined ? processNumber(process.id) === Number(idValue) : wildcardRegex(nameValue!).test(process.name)
  );

  if (targets.length === 0) {
    return idValue !== undefined
      ? fail(ctx, name, `Cannot find a process with the process identifier ${idValue}.`)
      : fail(ctx, name, `Cannot find a process with the name "${nameValue}". Verify the process name and call the cmdlet again.`);
  }

  targets.forEach((process) => ctx.host.stopProcess?.(process.id));
  return ok();
};

const getComputerInfo: CommandFn = (_args, _stdin, ctx) => {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  const screenInfo = typeof screen === "undefined" ? undefined : screen;
  const memory = (nav as (Navigator & { deviceMemory?: number }) | undefined)?.deviceMemory;
  const browser = nav?.userAgent.match(/(Edg|Chrome|Firefox|Safari)\/[\d.]+/)?.[0]?.replace("Edg", "Edge") ?? "Unknown browser";
  const rows: Array<[string, string]> = [
    ["OsName", "Taaniel OS"],
    ["OsVersion", "11.0 (portfolio build)"],
    ["CsName", SHELL_HOST],
    ["CsUserName", `${SHELL_HOST.toLowerCase()}\\${SHELL_USER.toLowerCase()}`],
    ["HostBrowser", browser],
    ["CsNumberOfLogicalProcessors", String(nav?.hardwareConcurrency ?? "Unknown")],
    ["CsPhysicallyInstalledMemory", memory ? `${memory} GB (reported by the browser, rounded)` : "Not reported by this browser"],
    ["DisplayResolution", screenInfo ? `${screenInfo.width} x ${screenInfo.height} @ ${globalThis.devicePixelRatio ?? 1}x` : "Unknown"],
    ["OsLocale", nav?.language ?? "Unknown"],
    ["TimeZone", Intl.DateTimeFormat().resolvedOptions().timeZone],
    ["NetworkStatus", ctx.host.isOffline?.() || nav?.onLine === false ? "Offline" : "Online"],
  ];
  return ok(["", ...rows.map(([key, value]) => `${key.padEnd(28)}: ${value}`), ""]);
};

const MAX_RESPONSE_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;

function normalizeRequestUrl(input: string) {
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Read at most MAX_RESPONSE_BYTES of a response body, so a huge download can't freeze the page. */
async function readCapped(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return { text: await response.text(), truncated: false };
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
    if (size >= MAX_RESPONSE_BYTES) {
      truncated = true;
      await reader.cancel();
      break;
    }
  }
  const bytes = new Uint8Array(Math.min(size, MAX_RESPONSE_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    const slice = chunk.subarray(0, Math.max(0, bytes.length - offset));
    bytes.set(slice, offset);
    offset += slice.byteLength;
  }
  return { text: new TextDecoder().decode(bytes), truncated };
}

function formatJson(value: unknown, depth = 0): string[] {
  if (Array.isArray(value)) {
    if (value.every((entry) => entry === null || typeof entry !== "object")) return [value.map((entry) => String(entry)).join(", ")];
    return value.slice(0, 50).flatMap((entry, index) => [...(index ? [""] : []), ...formatJson(entry, depth)]);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const width = Math.min(28, Math.max(...entries.map(([key]) => key.length), 1));
    return entries.map(([key, entry]) => {
      const shown =
        entry && typeof entry === "object"
          ? depth > 0
            ? "{…}"
            : JSON.stringify(entry).slice(0, 120)
          : String(entry);
      return `${key.padEnd(width)} : ${sanitizeForTerminal(shown)}`;
    });
  }
  return [sanitizeForTerminal(String(value))];
}

async function webRequest(args: string[], ctx: Ctx, name: string, rest: boolean): Promise<Output> {
  const parsed = parseArgs(args, { switches: ["UseBasicParsing"], params: ["Uri", "Method", "OutFile"] });
  // curl/wget muscle memory: ignore their single-letter flags.
  const target = parsed.params.Uri ?? parsed.positional.find((arg) => !arg.startsWith("-"));
  if (!target) return fail(ctx, name, "Cannot bind argument to parameter 'Uri' because it is null.");

  const url = normalizeRequestUrl(target);
  if (!url) return fail(ctx, name, `The URI prefix is not recognized: '${target}'. Only http and https are supported.`);

  const method = (parsed.params.Method ?? "GET").toUpperCase();
  if (!["GET", "HEAD"].includes(method)) return fail(ctx, name, `Only GET and HEAD requests are allowed from this terminal (got ${method}).`);
  // Offline, the name can't be resolved: PowerShell's own wording, and no request is made.
  if (ctx.host.isOffline?.()) {
    const { hostname, port, protocol } = new URL(url);
    return fail(ctx, name, `No such host is known. (${hostname}:${port || (protocol === "http:" ? "80" : "443")})`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const unlink = linkSignal(ctx, controller);
  const doFetch = ctx.host.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!doFetch) {
    clearTimeout(timer);
    unlink();
    return fail(ctx, name, "This browser can't make web requests.");
  }

  try {
    // Never send cookies or a referrer: the request is anonymous.
    const response = await doFetch(url, {
      method,
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
    const { text, truncated } = method === "HEAD" ? { text: "", truncated: false } : await readCapped(response);
    const clean = sanitizeForTerminal(text);

    if (parsed.params.OutFile) {
      const written = await writeContent(ctx, name, parsed.params.OutFile, [clean], false);
      return written.ok ? ok() : written;
    }

    if (rest) {
      try {
        return ok(["", ...formatJson(JSON.parse(text)), ""]);
      } catch {
        return ok(clean.split("\n").slice(0, 200));
      }
    }

    const headers: string[] = [];
    response.headers.forEach((value, key) => headers.push(`[${key}, ${sanitizeForTerminal(value)}]`));
    return ok([
      "",
      `StatusCode        : ${response.status}`,
      `StatusDescription : ${response.statusText || (response.ok ? "OK" : "")}`,
      `Content           : ${clean.slice(0, 200).replace(/\s+/g, " ")}${clean.length > 200 ? "…" : ""}`,
      `Headers           : {${headers.slice(0, 4).join(", ")}${headers.length > 4 ? "…" : ""}}`,
      `RawContentLength  : ${text.length}${truncated ? " (stopped at 512 KB)" : ""}`,
      "",
    ]);
  } catch (error) {
    checkInterrupt(ctx);
    if ((error as Error)?.name === "AbortError") return fail(ctx, name, "The operation has timed out.");
    return fail(
      ctx,
      name,
      "Unable to connect to the remote server. Browsers only let a page read sites that allow it (CORS); APIs such as api.github.com do."
    );
  } finally {
    clearTimeout(timer);
    unlink();
  }
}

const invokeWebRequest: CommandFn = (args, _stdin, ctx, name) => webRequest(args, ctx, name, false);
const invokeRestMethod: CommandFn = (args, _stdin, ctx, name) => webRequest(args, ctx, name, true);

/** ICMP is impossible from a web page, so reachability is timed over HTTPS - and the output says so. */
async function timeHttps(host: string, ctx: Ctx) {
  checkInterrupt(ctx);
  const doFetch = ctx.host.fetch ?? globalThis.fetch?.bind(globalThis);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  const unlink = linkSignal(ctx, controller);
  const started = performance.now();
  try {
    await doFetch?.(`https://${host}/`, { mode: "no-cors", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer", signal: controller.signal });
    return Math.max(1, Math.round(performance.now() - started));
  } catch {
    checkInterrupt(ctx);
    return null;
  } finally {
    clearTimeout(timer);
    unlink();
  }
}

function hostFromTarget(target: string) {
  const url = normalizeRequestUrl(target);
  return url ? new URL(url).hostname : null;
}

const ping: CommandFn = async (args, _stdin, ctx, name) => {
  const countIndex = args.findIndex((arg) => /^[-/]n$/i.test(arg));
  const count = Math.min(10, Math.max(1, countIndex >= 0 ? Number(args[countIndex + 1]) || 4 : 4));
  const target = args.find((arg, index) => !/^[-/]/.test(arg) && (countIndex < 0 || index !== countIndex + 1));
  const host = target ? hostFromTarget(target) : null;
  if (!host) return fail(ctx, name, "Ping request could not find the host. Please check the name and try again.");
  if (ctx.host.isOffline?.()) return { out: [`Ping request could not find host ${host}. Please check the name and try again.`], ok: false };

  const times: number[] = [];
  const lines = [``, `Pinging ${host} over HTTPS (browsers can't send ICMP):`];
  for (let attempt = 0; attempt < count; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const time = await timeHttps(host, ctx);
    if (time === null) lines.push("Request timed out.");
    else {
      times.push(time);
      lines.push(`Reply from ${host}: time=${time}ms`);
    }
  }
  lines.push("", `Ping statistics for ${host}:`, `    Packets: Sent = ${count}, Received = ${times.length}, Lost = ${count - times.length} (${Math.round(((count - times.length) / count) * 100)}% loss),`);
  if (times.length) {
    lines.push(
      "Approximate round trip times in milli-seconds:",
      `    Minimum = ${Math.min(...times)}ms, Maximum = ${Math.max(...times)}ms, Average = ${Math.round(times.reduce((a, b) => a + b, 0) / times.length)}ms`
    );
  }
  return { out: lines, ok: times.length > 0 };
};

const testConnection: CommandFn = async (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: ["Quiet"], params: ["TargetName", "Count"] });
  const host = hostFromTarget(parsed.params.TargetName ?? parsed.positional[0] ?? "");
  if (!host) return fail(ctx, name, "Cannot bind argument to parameter 'TargetName' because it is null.");
  if (ctx.host.isOffline?.()) {
    if (parsed.switches.has("Quiet")) return { out: ["False"], ok: false };
    return fail(ctx, name, `Testing connection to computer '${host}' failed: No such host is known.`);
  }
  const count = Math.min(10, Math.max(1, Number(parsed.params.Count) || 4));
  const rows: string[] = [];
  let received = 0;
  for (let attempt = 1; attempt <= count; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const time = await timeHttps(host, ctx);
    if (time !== null) received += 1;
    rows.push(`${String(attempt).padStart(4)} ${SHELL_HOST.padEnd(16)} ${host.padEnd(28)} ${String(time ?? "*").padStart(7)} ${(time === null ? "TimedOut" : "Success").padStart(9)}`);
  }
  if (parsed.switches.has("Quiet")) return ok([received > 0 ? "True" : "False"]);
  return {
    out: [
      "",
      `   Destination: ${host}   (timed over HTTPS)`,
      "",
      `${TABLE}${"Ping".padStart(4)} ${"Source".padEnd(16)} ${"Address".padEnd(28)} ${"Latency".padStart(7)} ${"Status".padStart(9)}${RESET}`,
      `${TABLE}${"".padStart(4)} ${"".padEnd(16)} ${"".padEnd(28)} ${"(ms)".padStart(7)} ${"".padStart(9)}${RESET}`,
      `${TABLE}${"----".padStart(4)} ${"------".padEnd(16)} ${"-------".padEnd(28)} ${"-------".padStart(7)} ${"------".padStart(9)}${RESET}`,
      ...rows,
      "",
    ],
    ok: received > 0,
  };
};

const HASH_ALGORITHMS: Record<string, string> = { sha1: "SHA-1", sha256: "SHA-256", sha384: "SHA-384", sha512: "SHA-512" };

function fileBytes(node: VirtualNode): Uint8Array<ArrayBuffer> | null {
  if (node.kind !== "file") return null;
  if (typeof node.content === "string") return new TextEncoder().encode(node.content);
  if (node.source?.startsWith("data:")) {
    const base64 = node.source.slice(node.source.indexOf(",") + 1);
    try {
      return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    } catch {
      return null;
    }
  }
  return null;
}

const getFileHash: CommandFn = async (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { params: ["Path", "Algorithm"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  const algorithm = (parsed.params.Algorithm ?? "SHA256").toUpperCase();
  const subtleName = own(HASH_ALGORITHMS, algorithm.toLowerCase());
  if (!subtleName) {
    return fail(ctx, name, algorithm === "MD5" ? "MD5 isn't available in browser cryptography; use SHA256." : `Cannot validate argument on parameter 'Algorithm'. The argument "${algorithm}" does not belong to the set "SHA1,SHA256,SHA384,SHA512".`);
  }
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return fail(ctx, name, "Cryptography is not available in this browser.");

  const targets = parsed.params.Path ? [parsed.params.Path, ...parsed.positional] : parsed.positional;
  if (!targets.length) return fail(ctx, name, "Cannot bind argument to parameter 'Path' because it is null.");
  const nodes = ctx.fs.getNodes();
  const hashes: Array<{ hex: string; path: string }> = [];
  let okay = true;

  for (const { path } of expandPaths(targets, ctx)) {
    const node = nodes[path];
    const bytes = node ? fileBytes(node) : null;
    if (!node || node.kind !== "file" || !bytes) {
      fail(ctx, name, node ? `Unable to read the file '${toDisplayPath(path)}'.` : `Cannot find path '${toDisplayPath(path)}' because it does not exist.`);
      okay = false;
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const digest = new Uint8Array(await subtle.digest(subtleName, bytes));
    hashes.push({ hex: Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase(), path });
  }

  if (!hashes.length) return { out: [], ok: okay };
  const width = Math.max(...hashes.map((entry) => entry.hex.length)) + 2;
  return {
    out: [
      "",
      `${TABLE}${"Algorithm".padEnd(16)}${"Hash".padEnd(width)}Path${RESET}`,
      `${TABLE}${"---------".padEnd(16)}${"----".padEnd(width)}----${RESET}`,
      ...hashes.map((entry) => `${algorithm.padEnd(16)}${entry.hex.padEnd(width)}${toDisplayPath(entry.path)}`),
      "",
    ],
    ok: okay,
  };
};

const getClipboard: CommandFn = async (_args, _stdin, ctx, name) => {
  const read = ctx.host.readClipboard ?? (() => navigator.clipboard.readText());
  try {
    return ok(sanitizeForTerminal(await read()).split("\n"));
  } catch {
    return fail(ctx, name, "The clipboard is not available: the browser denied access.");
  }
};

const setClipboard: CommandFn = async (args, stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: ["Append"], params: ["Value"] });
  const text = [...(parsed.params.Value !== undefined ? [parsed.params.Value] : parsed.positional), ...(stdin ?? [])].map(stripAnsi).join("\n");
  const write = ctx.host.writeClipboard ?? ((value: string) => navigator.clipboard.writeText(value));
  try {
    await write(text);
    return ok();
  } catch {
    return fail(ctx, name, "The clipboard is not available: the browser denied access.");
  }
};

function secureRandom() {
  const buffer = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buffer);
  return buffer[0] / 2 ** 32;
}

const getRandom: CommandFn = (args, stdin, ctx, name) => {
  const parsed = parseArgs(args, { params: ["Minimum", "Maximum", "Count"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  if (stdin && stdin.length) {
    const count = Math.max(1, Number(parsed.params.Count) || 1);
    const pool = [...stdin];
    const picks: string[] = [];
    while (picks.length < count && pool.length) picks.push(pool.splice(Math.floor(secureRandom() * pool.length), 1)[0]);
    return ok(picks);
  }
  const minimum = Number(parsed.params.Minimum ?? 0);
  const maximum = Number(parsed.params.Maximum ?? parsed.positional[0] ?? 2147483647);
  if (!(maximum > minimum)) return fail(ctx, name, `The Minimum value (${minimum}) cannot be greater than or equal to the Maximum value (${maximum}).`);
  return ok([String(Math.floor(minimum + secureRandom() * (maximum - minimum)))]);
};

const startSleep: CommandFn = async (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { params: ["Seconds", "Milliseconds"] });
  const milliseconds = parsed.params.Milliseconds !== undefined ? Number(parsed.params.Milliseconds) : Number(parsed.params.Seconds ?? parsed.positional[0] ?? 0) * 1000;
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return fail(ctx, name, "Cannot validate argument on parameter 'Seconds'.");
  await new Promise<void>((resolve) => {
    const signal = ctx.host.signal;
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, Math.min(milliseconds, 60_000));
    // Ctrl+C ends the wait at once.
    signal?.addEventListener("abort", finish, { once: true });
    if (signal?.aborted) finish();
  });
  checkInterrupt(ctx);
  return ok();
};

const testPath: CommandFn = (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { params: ["Path", "PathType"] });
  const target = parsed.params.Path ?? parsed.positional[0];
  if (!target) return fail(ctx, name, "Cannot bind argument to parameter 'Path' because it is null.");
  const nodes = ctx.fs.getNodes();
  const node = nodes[resolveShellPath(target, ctx.session.cwd, nodes)];
  const type = parsed.params.PathType?.toLowerCase();
  const matches = Boolean(node) && (!type || type === "any" || (type === "container" ? node!.kind === "directory" : node!.kind === "file"));
  return ok([matches ? "True" : "False"]);
};

const getItem: CommandFn = (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { params: ["Path"] });
  const targets = parsed.params.Path ? [parsed.params.Path, ...parsed.positional] : parsed.positional;
  if (!targets.length) return fail(ctx, name, "Cannot bind argument to parameter 'Path' because it is null.");
  const nodes = ctx.fs.getNodes();
  const out: string[] = [];
  const objects: ShellObject[] = [];
  let okay = true;
  for (const { path } of expandPaths(targets, ctx)) {
    const node = nodes[path];
    if (!node) {
      fail(ctx, name, `Cannot find path '${toDisplayPath(path)}' because it does not exist.`);
      okay = false;
      continue;
    }
    objects.push(fileObject(node));
    out.push(
      "",
      `Name          : ${sanitizeForTerminal(node.name)}`,
      `FullName      : ${toDisplayPath(path)}`,
      `Mode          : ${modeOf(node, path === TRASH_PATH)}`,
      ...(node.kind === "file" ? [`Length        : ${fileLength(node) || 0}`, `Extension     : .${node.extension}`] : []),
      `CreationTime  : ${new Date(node.createdAt).toLocaleString()}`,
      `LastWriteTime : ${new Date(node.updatedAt).toLocaleString()}`,
      ...(node.kind === "file" && node.readonly ? ["IsReadOnly    : True"] : [])
    );
  }
  if (out.length) out.push("");
  return { out, ok: okay, objects };
};

/** Path arguments: -Path and the positional ones, or else the piped lines. */
function pathArguments(parsed: ParsedArgs, stdin: string[] | null): string[] {
  const given = [parsed.params.Path, parsed.params.LiteralPath, ...parsed.positional].filter((value): value is string => value !== undefined);
  return given.length ? given : (stdin ?? []).filter((line) => line !== "");
}

const joinPathCmd: CommandFn = (args, stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: ["Resolve"], params: ["Path", "ChildPath", "AdditionalChildPath"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);

  const positional = [...parsed.positional];
  const parent = parsed.params.Path ?? positional.shift();
  const child = parsed.params.ChildPath ?? positional.shift();
  const extra = parsed.params.AdditionalChildPath !== undefined ? [parsed.params.AdditionalChildPath, ...positional] : positional;
  const parents = parent !== undefined ? [parent] : (stdin ?? []).filter((line) => line !== "");

  if (!parents.length) return fail(ctx, name, "Cannot bind argument to parameter 'Path' because it is null.");
  if (parents.includes("")) return fail(ctx, name, "Cannot bind argument to parameter 'Path' because it is an empty string.");
  if (child === undefined) return fail(ctx, name, "Cannot bind argument to parameter 'ChildPath' because it is null.");

  const joined = parents.map((entry) => joinPath(entry, child, ...extra));
  if (parsed.switches.has("Resolve")) {
    const nodes = ctx.fs.getNodes();
    const missing = joined.find((entry) => !nodes[resolveShellPath(entry, ctx.session.cwd, nodes)]);
    if (missing !== undefined) return fail(ctx, name, `Cannot find path '${missing}' because it does not exist.`);
  }
  return ok(joined.map(sanitizeForTerminal));
};

const SPLIT_PARTS: Array<[string, SplitPart]> = [
  ["Qualifier", "qualifier"],
  ["NoQualifier", "noqualifier"],
  ["LeafBase", "leafbase"],
  ["Extension", "extension"],
  ["Leaf", "leaf"],
  ["Parent", "parent"],
];

const splitPathCmd: CommandFn = (args, stdin, ctx, name) => {
  const parsed = parseArgs(args, {
    switches: [...SPLIT_PARTS.map(([flag]) => flag), "IsAbsolute", "Resolve"],
    params: ["Path", "LiteralPath"],
  });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);

  const chosen = SPLIT_PARTS.filter(([flag]) => parsed.switches.has(flag));
  const absolute = parsed.switches.has("IsAbsolute");
  if (chosen.length + (absolute ? 1 : 0) > 1) return fail(ctx, name, "Parameter set cannot be resolved using the specified named parameters.");

  const targets = pathArguments(parsed, stdin);
  if (!targets.length) return fail(ctx, name, "Cannot bind argument to parameter 'Path' because it is null.");

  const out: string[] = [];
  let okay = true;
  for (const target of targets) {
    if (absolute) {
      out.push(isAbsolutePath(target) ? "True" : "False");
      continue;
    }
    const part = splitPath(target, chosen[0]?.[1] ?? "parent");
    if (part === null) {
      fail(ctx, name, `Cannot parse path because path '${target}' does not have a qualifier specified.`);
      okay = false;
    } else {
      out.push(sanitizeForTerminal(part));
    }
  }
  return { out, ok: okay };
};

const resolvePathCmd: CommandFn = (args, stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: ["Relative"], params: ["Path", "LiteralPath"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  const targets = pathArguments(parsed, stdin);
  if (!targets.length) return fail(ctx, name, "Cannot bind argument to parameter 'Path' because it is null.");

  const nodes = ctx.fs.getNodes();
  const found: string[] = [];
  let okay = true;
  for (const target of targets) {
    const hits = expandPaths([target], ctx).filter((hit) => nodes[hit.path]);
    if (!hits.length) {
      fail(ctx, name, `Cannot find path '${toDisplayPath(resolveShellPath(target, ctx.session.cwd, nodes))}' because it does not exist.`);
      okay = false;
    }
    hits.forEach((hit) => found.push(hit.path));
  }
  if (!found.length) return { out: [], ok: okay };

  if (parsed.switches.has("Relative")) {
    const lines = found.map((path) => (path === ctx.session.cwd ? "." : path.startsWith(ctx.session.cwd === "/" ? "/" : `${ctx.session.cwd}/`) ? `.\\${displayRelative(path, ctx.session.cwd)}` : toDisplayPath(path)));
    return { out: lines, ok: okay };
  }
  const result = emitItems(found.map(pathInfoObject));
  return { ...result, ok: okay };
};

const pushLocation: CommandFn = (args, stdin, ctx) => {
  const previous = ctx.session.cwd;
  const result = setLocation(args, stdin, ctx, "Push-Location") as Output;
  if (result.ok) ctx.session.locationStack.push(previous);
  return result;
};

const popLocation: CommandFn = (_args, _stdin, ctx) => {
  const target = ctx.session.locationStack.pop();
  if (target && ctx.fs.getNodes()[target]?.kind === "directory") {
    ctx.session.previousCwd = ctx.session.cwd;
    ctx.session.cwd = target;
  }
  return ok();
};

const clearHistory: CommandFn = (_args, _stdin, ctx) => {
  ctx.session.history.length = 0;
  return ok();
};

const getVariable: CommandFn = (args, _stdin, ctx) => {
  const filter = args[0] ? wildcardRegex(args[0].replace(/^\$/, "")) : null;
  const entries = Object.entries(ctx.session.variables).filter(([key]) => !filter || filter.test(key));
  return ok([
    "",
    `${TABLE}${"Name".padEnd(31)}Value${RESET}`,
    `${TABLE}${"----".padEnd(31)}-----${RESET}`,
    ...entries.map(([key, value]) => `${key.padEnd(31)}${sanitizeForTerminal(toText(value)).slice(0, 80)}`),
    "",
  ]);
};

const EXTRA_COMMANDS: Record<string, CommandSpec> = {
  "Write-Host": { aliases: [], synopsis: "Print coloured text: Write-Host 'hi' -ForegroundColor Cyan.", syntax: "Write-Host [<object>] [-ForegroundColor <color>] [-BackgroundColor <color>]", run: writeHost },
  "Get-Process": { aliases: ["ps", "gps"], synopsis: "List the apps running on this desktop.", syntax: "Get-Process [[-Name] <string>] [-Id <int>]", run: getProcess },
  "Stop-Process": { aliases: ["kill", "spps"], synopsis: "Close a running app by Id or name.", syntax: "Stop-Process [-Id] <int> | -Name <string>", run: stopProcess },
  "Get-ComputerInfo": { aliases: ["systeminfo", "gin"], synopsis: "Show real details about this device and browser.", syntax: "Get-ComputerInfo", run: getComputerInfo },
  "Invoke-WebRequest": { aliases: ["iwr", "curl", "wget"], synopsis: "Fetch a web page (anonymously; CORS rules apply).", syntax: "Invoke-WebRequest [-Uri] <string> [-Method GET|HEAD] [-OutFile <path>]", run: invokeWebRequest },
  "Invoke-RestMethod": { aliases: ["irm"], synopsis: "Fetch and format JSON: irm api.github.com/users/Taan1el", syntax: "Invoke-RestMethod [-Uri] <string>", run: invokeRestMethod },
  "Test-Connection": { aliases: [], synopsis: "Check a host is reachable (timed over HTTPS).", syntax: "Test-Connection [-TargetName] <string> [-Count <int>] [-Quiet]", run: testConnection },
  ping: { aliases: [], synopsis: "Ping a host (timed over HTTPS - browsers can't send ICMP).", syntax: "ping <host> [-n <count>]", run: ping },
  "Get-FileHash": { aliases: [], synopsis: "Compute a real SHA hash of a file.", syntax: "Get-FileHash [-Path] <string[]> [-Algorithm SHA1|SHA256|SHA384|SHA512]", run: getFileHash },
  "Get-Clipboard": { aliases: ["gcb"], synopsis: "Paste the clipboard into the terminal.", syntax: "Get-Clipboard", run: getClipboard },
  "Set-Clipboard": { aliases: ["scb", "clip"], synopsis: "Copy text or piped output: ls | clip", syntax: "Set-Clipboard [-Value] <string>", run: setClipboard },
  "Get-Random": { aliases: ["random"], synopsis: "A cryptographically random number, or a random piped line.", syntax: "Get-Random [-Minimum <int>] [-Maximum <int>]", run: getRandom },
  "Start-Sleep": { aliases: ["sleep"], synopsis: "Wait for a number of seconds (up to 60).", syntax: "Start-Sleep [-Seconds] <double>", run: startSleep },
  "Test-Path": { aliases: [], synopsis: "True when a path exists.", syntax: "Test-Path [-Path] <string> [-PathType Container|Leaf]", run: testPath },
  "Get-Item": { aliases: ["gi"], synopsis: "Show details about a file or folder.", syntax: "Get-Item [-Path] <string[]>", run: getItem },
  "Push-Location": { aliases: ["pushd"], synopsis: "Change folder, remembering the current one.", syntax: "Push-Location [<path>]", run: pushLocation },
  "Pop-Location": { aliases: ["popd"], synopsis: "Return to the folder saved by Push-Location.", syntax: "Pop-Location", run: popLocation },
  "Clear-History": { aliases: ["clhy"], synopsis: "Forget this terminal's command history.", syntax: "Clear-History", run: clearHistory },
  "Get-Variable": { aliases: ["gv"], synopsis: "List variables set in this session.", syntax: "Get-Variable [<name>]", run: getVariable },
  "Join-Path": { aliases: [], synopsis: "Join folder and file names into one path: Join-Path $HOME Documents.", syntax: "Join-Path [-Path] <string> [-ChildPath] <string> [[-AdditionalChildPath] <string[]>] [-Resolve]", run: joinPathCmd },
  "Split-Path": { aliases: [], synopsis: "Take a path apart: -Parent (the default), -Leaf, -LeafBase, -Extension, -Qualifier.", syntax: "Split-Path [-Path] <string[]> [-Parent] [-Leaf] [-LeafBase] [-Extension] [-Qualifier] [-NoQualifier] [-IsAbsolute]", run: splitPathCmd },
  "Resolve-Path": { aliases: ["rvpa"], synopsis: "Turn a relative path or wildcard into full paths: Resolve-Path ..\\*.", syntax: "Resolve-Path [-Path] <string[]> [-Relative]", run: resolvePathCmd },
  "Invoke-Expression": { aliases: ["iex"], synopsis: "Run text as a command: iex 'Get-Date' (it goes through this shell, never through JavaScript).", syntax: "Invoke-Expression [-Command] <string>", run: invokeExpression },
  "Get-PSReadLineKeyHandler": { aliases: [], synopsis: "List the keys the line editor answers to: editing, history, completion and the terminal's own.", syntax: "Get-PSReadLineKeyHandler [-Bound] [-Unbound]", run: getKeyHandler },
  "New-Guid": { aliases: [], synopsis: "Make a new random GUID: $id = New-Guid.", syntax: "New-Guid [-Empty]", run: newGuid },
  "Get-Uptime": { aliases: [], synopsis: "How long this desktop session has been running.", syntax: "Get-Uptime [-Since]", run: getUptime },
  "Get-Host": { aliases: [], synopsis: "Show the shell host: its name, version and culture.", syntax: "Get-Host", run: getHost },
  "ConvertTo-Json": { aliases: [], synopsis: "Write piped objects as JSON text: ls | select Name, Length | ConvertTo-Json.", syntax: "<command> | ConvertTo-Json [-Depth <int>] [-Compress] [-AsArray]", run: convertToJson },
  "ConvertFrom-Json": { aliases: [], synopsis: "Turn JSON text into objects: '{\"a\": 1}' | ConvertFrom-Json.", syntax: "<command> | ConvertFrom-Json [-InputObject <string>] [-AsHashtable]", run: convertFromJson },
};

// ------------------------------------------------------------------ registry

const COMMANDS: Record<string, CommandSpec> = {
  "Get-ChildItem": { aliases: ["ls", "dir", "gci"], synopsis: "List the items in a folder.", syntax: "Get-ChildItem [[-Path] <string>] [-Recurse] [-Depth <uint>] [-Force] [-Name] [-Directory] [-File] [-Filter <string>]", run: getChildItem },
  "Set-Location": { aliases: ["cd", "chdir", "sl"], synopsis: "Change the current folder. 'cd -' goes back.", syntax: "Set-Location [[-Path] <string>]", run: setLocation },
  "Get-Location": { aliases: ["pwd", "gl"], synopsis: "Show the current folder.", syntax: "Get-Location", run: getLocation },
  "Get-Content": { aliases: ["cat", "type", "gc"], synopsis: "Print the contents of a text file.", syntax: "Get-Content [-Path] <string[]> [-TotalCount <int>] [-Tail <int>]", run: getContent },
  "New-Item": { aliases: ["ni"], synopsis: "Create a file or folder.", syntax: "New-Item [-Path] <string> [-ItemType File|Directory] [-Name <string>] [-Value <string>] [-Force]", run: newItem },
  mkdir: { aliases: ["md"], synopsis: "Create folders, including any missing parents.", syntax: "mkdir <path> [<path>...]", run: makeDirectory },
  touch: { aliases: [], synopsis: "Create an empty file, or update a file's timestamp.", syntax: "touch <path> [<path>...]", run: touch },
  "Remove-Item": { aliases: ["rm", "del", "erase", "rd", "rmdir", "ri"], synopsis: "Move items to the Recycle Bin.", syntax: "Remove-Item [-Path] <string[]> [-Recurse] [-Force]", run: removeItem },
  "Move-Item": { aliases: ["mv", "move", "mi"], synopsis: "Move or rename an item.", syntax: "Move-Item [-Path] <string[]> [-Destination] <string>", run: moveItem },
  "Copy-Item": { aliases: ["cp", "copy", "cpi"], synopsis: "Copy files and folders.", syntax: "Copy-Item [-Path] <string[]> [-Destination] <string> [-Recurse]", run: copyItem },
  "Rename-Item": { aliases: ["ren", "rni"], synopsis: "Rename an item in place.", syntax: "Rename-Item [-Path] <string> [-NewName] <string>", run: renameItem },
  "Set-Content": { aliases: ["sc"], synopsis: "Replace the contents of a file.", syntax: "Set-Content [-Path] <string> [-Value] <string>", run: setContent },
  "Add-Content": { aliases: ["ac"], synopsis: "Append to a file.", syntax: "Add-Content [-Path] <string> [-Value] <string>", run: setContent },
  "Out-File": { aliases: [], synopsis: "Write piped output to a file.", syntax: "<command> | Out-File [-FilePath] <string> [-Append]", run: outFile },
  "Write-Output": { aliases: ["echo", "write"], synopsis: "Print text. Redirect with > or >> to write a file.", syntax: "Write-Output <object[]>", run: writeOutput },
  "Clear-Host": { aliases: ["cls", "clear"], synopsis: "Clear the screen.", syntax: "Clear-Host", run: clearHost },
  "Get-History": { aliases: ["history", "h", "ghy"], synopsis: "List commands entered this session.", syntax: "Get-History", run: getHistory },
  "Start-Process": { aliases: ["start", "saps", "ii", "Invoke-Item", "open"], synopsis: "Open a file, folder, app or URL.", syntax: "Start-Process [-FilePath] <string>", run: startProcess },
  tree: { aliases: [], synopsis: "Draw the folder tree. /F lists files, /A uses ASCII.", syntax: "tree [<path>] [/F] [/A]", run: tree },
  "Select-String": { aliases: ["sls", "findstr", "grep"], synopsis: "Search text in files or piped output.", syntax: "Select-String [-Pattern] <string> [[-Path] <string[]>] [-SimpleMatch] [-CaseSensitive] [-NotMatch]", run: selectString },
  "Sort-Object": { aliases: ["sort"], synopsis: "Sort piped lines or objects: ls | sort Length -Descending.", syntax: "<command> | Sort-Object [[-Property] <string[]|{ expression }>] [-Descending] [-Unique]", run: sortObject },
  "Select-Object": { aliases: ["select"], synopsis: "Pick properties, or the first or last piped items: ls | select Name, Length -First 3.", syntax: "<command> | Select-Object [[-Property] <string[]>] [-ExpandProperty <string>] [-First <int>] [-Last <int>] [-Skip <int>] [-Unique]", run: selectObject },
  "Measure-Object": { aliases: ["measure"], synopsis: "Count piped items, or add up a property: ls | measure Length -Sum.", syntax: "<command> | Measure-Object [[-Property] <string>] [-Sum] [-Average] [-Maximum] [-Minimum] [-Line] [-Word] [-Character]", run: measureObject },
  "Where-Object": { aliases: ["where", "?"], synopsis: "Keep piped items that match: ls | where Length -gt 1kb.", syntax: "<command> | Where-Object [-Property] <string> -GT|-EQ|-Like|-Match... <value>  |  Where-Object { $_.Length -gt 1kb }", run: whereObject },
  "ForEach-Object": { aliases: ["foreach", "%"], synopsis: "Run an expression on each piped item: ls | % { $_.Name }.", syntax: "<command> | ForEach-Object { $_.Name }  |  ForEach-Object -MemberName <string>", run: forEachObject },
  "Format-Table": { aliases: ["ft"], synopsis: "Show piped objects as a table: ls | ft Name, Length.", syntax: "<command> | Format-Table [[-Property] <string[]>]", run: formatTableCmdlet },
  "Format-List": { aliases: ["fl"], synopsis: "Show piped objects as a list of properties: ps | fl *.", syntax: "<command> | Format-List [[-Property] <string[]>]", run: formatListCmdlet },
  "Get-Date": { aliases: ["date"], synopsis: "Show the current date and time.", syntax: "Get-Date", run: getDate },
  whoami: { aliases: [], synopsis: "Show the signed-in user.", syntax: "whoami", run: whoami },
  hostname: { aliases: [], synopsis: "Show the computer name.", syntax: "hostname", run: hostname },
  exit: { aliases: [], synopsis: "Close this terminal window.", syntax: "exit", run: exitShell },
  neofetch: { aliases: [], synopsis: "Show this system, with style.", syntax: "neofetch", run: neofetch },
  cowsay: { aliases: [], synopsis: "A cow says what you type.", syntax: "cowsay <text>", run: cowsay },
  sudo: { aliases: [], synopsis: "Ask nicely for more rights.", syntax: "sudo <command>", run: sudo },
  matrix: { aliases: [], synopsis: "There is no spoon.", syntax: "matrix", run: matrix },
  about: { aliases: [], synopsis: "About Taaniel - opens the About app.", syntax: "about", run: about },
  projects: { aliases: [], synopsis: "List projects, or open one by id.", syntax: "projects [<id>]", run: projects },
  contact: { aliases: [], synopsis: "Contact details - opens the Contact app.", syntax: "contact", run: contact },
  resume: { aliases: ["cv"], synopsis: "Open the CV.", syntax: "resume", run: resume },
};

const COMMAND_LOOKUP = new Map<string, string>();
Object.entries(COMMANDS).forEach(([canonical, spec]) => {
  COMMAND_LOOKUP.set(canonical.toLowerCase(), canonical);
  spec.aliases.forEach((alias) => COMMAND_LOOKUP.set(alias.toLowerCase(), canonical));
});

/** Where the apps that launch from the prompt notionally live. A neutral place: this is the owner's own OS. */
const APPLICATION_FOLDER = "C:\\Program Files\\Taaniel OS";
const APPLICATION_VERSION = "11.0.0.0";
const MODULE_NAME = "Taaniel.Shell";

/** notepad.exe, calc.exe...: the names in EXECUTABLES that are programs rather than ms-settings: addresses. */
function applicationNames() {
  return Object.keys(EXECUTABLES)
    .filter((entry) => !entry.includes(":"))
    .map((entry) => `${entry}.exe`)
    .sort((a, b) => a.localeCompare(b));
}

const COMMAND_TYPES = ["alias", "cmdlet", "function", "application", "all"];

const getCommand: CommandFn = (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { params: ["Name", "CommandType"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  const pattern = parsed.params.Name ?? parsed.positional[0];
  const type = (parsed.params.CommandType ?? "all").toLowerCase();
  if (!COMMAND_TYPES.includes(type)) {
    return fail(ctx, name, `Cannot bind parameter 'CommandType'. Cannot convert value "${parsed.params.CommandType}" to type "System.Management.Automation.CommandTypes". Specify one of: Alias, Cmdlet, Function, Application, All.`);
  }
  const wants = (kind: string) => type === "all" || type === kind;

  // A name with no wildcard asks what that one name is, and gets Version and Source too.
  if (pattern && !/[*?]/.test(pattern)) {
    const key = pattern.toLowerCase();
    const canonical = COMMAND_LOOKUP.get(key);
    const application = applicationNames().find((entry) => entry.toLowerCase() === key || entry.toLowerCase() === `${key}.exe`);
    const rows: Array<[string, string, string, string]> = [];

    if (canonical && key !== canonical.toLowerCase()) {
      if (wants("alias")) rows.push(["Alias", `${pattern} -> ${canonical}`, "", ""]);
    } else if (canonical && (type === "all" || type === (canonical.includes("-") ? "cmdlet" : "function"))) {
      rows.push([canonical.includes("-") ? "Cmdlet" : "Function", canonical, POWERSHELL_VERSION, MODULE_NAME]);
    }
    if (application && wants("application")) rows.push(["Application", application, APPLICATION_VERSION, `${APPLICATION_FOLDER}\\${application}`]);

    if (!rows.length) {
      return fail(
        ctx,
        name,
        `The term '${pattern}' is not recognized as a name of a cmdlet, function, script file, or executable program.\nCheck the spelling of the name, or if a path was included, verify that the path is correct and try again.`
      );
    }
    const nameWidth = Math.max(4, ...rows.map((row) => row[1].length)) + 2;
    return ok([
      "",
      `${TABLE}${"CommandType".padEnd(16)}${"Name".padEnd(nameWidth)}${"Version".padEnd(12)}Source${RESET}`,
      `${TABLE}${"-----------".padEnd(16)}${"----".padEnd(nameWidth)}${"-------".padEnd(12)}------${RESET}`,
      ...rows.map((row) => `${row[0].padEnd(16)}${sanitizeForTerminal(row[1]).padEnd(nameWidth)}${row[2].padEnd(12)}${row[3]}`),
      "",
    ]);
  }

  const filter = pattern ? wildcardRegex(pattern) : null;
  const rows = [
    ...Object.keys(COMMANDS)
      .filter((entry) => !filter || filter.test(entry))
      .sort((a, b) => a.localeCompare(b))
      .filter((entry) => wants(entry.includes("-") ? "cmdlet" : "function"))
      .map((entry) => [entry.includes("-") ? "Cmdlet" : "Function", entry]),
    ...(wants("application") ? applicationNames().filter((entry) => !filter || filter.test(entry)).map((entry) => ["Application", entry]) : []),
  ];
  // A wildcard that matches nothing prints nothing, as in PowerShell.
  if (pattern && !rows.length) return ok();
  return ok([
    "",
    `${TABLE}${"CommandType".padEnd(16)}Name${RESET}`,
    `${TABLE}${"-----------".padEnd(16)}----${RESET}`,
    ...rows.map(([kind, entry]) => `${kind.padEnd(16)}${entry}`),
    "",
  ]);
};

const getAlias: CommandFn = () => {
  const rows = Object.entries(COMMANDS).flatMap(([canonical, spec]) => spec.aliases.map((alias) => `${"Alias".padEnd(16)}${alias} -> ${canonical}`));
  return ok(["", `${TABLE}${"CommandType".padEnd(16)}Name${RESET}`, `${TABLE}${"-----------".padEnd(16)}----${RESET}`, ...rows.sort(), ""]);
};

const HELP_OVERVIEW = [
  "",
  `${TABLE}Files and folders${RESET}`,
  "  ls, dir          List a folder                    ls -Recurse, ls *.md",
  "  cd               Change folder                    cd .., cd ~, cd -, cd Documents",
  "  cat, type        Print a text file                cat Welcome.md",
  "  mkdir, ni, touch Create folders and files         mkdir Notes, ni todo.txt",
  "  rm, del          Move to the Recycle Bin          rm old.txt, rm Folder -Recurse",
  "  mv, cp, ren      Move, copy, rename               mv a.txt Documents, ren a.txt b.txt",
  "  echo, > , >>     Write text into a file           echo hello > hello.txt",
  "  sls, findstr     Search files or piped output     sls todo *.md, ls | sls Case",
  "  tree             Folder tree (/F for files)       tree /F",
  "",
  `${TABLE}Apps${RESET}`,
  "  start, ii        Open a file, folder, app or URL  start ., start https://github.com",
  "  notepad, calc, mspaint, code, explorer, msedge",
  "",
  `${TABLE}Portfolio${RESET}`,
  "  about, projects [id], contact, resume",
  "",
  `${TABLE}System and network${RESET}`,
  "  ps, kill         Running apps; close one          ps, kill -Name notes",
  "  systeminfo       Real details of this device      systeminfo",
  "  irm, iwr, curl   Web requests (no cookies sent)   irm api.github.com/users/Taan1el",
  "  ping             Reachability over HTTPS          ping github.com",
  "  Get-FileHash     Real SHA-256 of a file           Get-FileHash Welcome.md",
  "  clip, gcb        Clipboard                        ls | clip",
  "  wsl              Open the x86 emulator (v86)      wsl",
  "  ms-settings:     Open a Settings page             start ms-settings:display",
  "",
  `${TABLE}Objects and pipelines${RESET}`,
  "  where, ?         Keep items that match            ls | where Length -gt 1kb",
  "  select, sort     Pick properties, put in order    ls | sort Length -Descending | select Name, Length",
  "  foreach, %       Run an expression per item       ls | % { $_.Length * 2 }",
  "  ft, fl, measure  Tables, lists, totals            ps | ft ProcessName, Status",
  "                                                    ls | measure Length -Sum",
  "",
  `${TABLE}Scripting${RESET}`,
  "  $x = 5           Variables, maths, comparisons    $x * 2, 'ab' * 3, 5 -gt 3",
  "  .\\script.ps1     Run a script from this drive     echo 'Write-Host hi -ForegroundColor Cyan' > a.ps1",
  "  Write-Host       Coloured output                  Write-Host hi -ForegroundColor Green",
  "  Test-Path, gi    Check or inspect a path          Test-Path Documents",
  "  &&, ||           Run the next command only after   mkdir Demo && cd Demo",
  "                   success (&&) or failure (||)      Get-Content x.txt || echo none",
  "  iex              Run text as a command             iex 'Get-Date'",
  "  Join-Path, Split-Path, Resolve-Path               Join-Path $HOME Documents",
  "  ConvertTo-Json, ConvertFrom-Json, New-Guid        ls | select Name | ConvertTo-Json",
  "",
  `${TABLE}Shell${RESET}`,
  "  cls, history, Get-Date, whoami, Get-Command, Get-Alias, help <command>, exit",
  "  help <command> -Examples, <command> -?, help about_*   More help, and help topics",
  "  wt               Open another tab here            wt -p cmd, wt -d ..\\Documents",
  "  cmd, pwsh        Start a shell inside this one    cmd, then exit comes back here",
  "  Tab completes commands and paths. Up/Down recalls history. Ctrl+C cancels, Ctrl+L clears.",
  "  F6 moves focus out of the terminal (Tab and Esc belong to the shell). Ctrl+, opens settings.",
  "",
];

type HelpDetail = "default" | "examples" | "detailed" | "full";

const heading = (title: string) => `${TABLE}${title}${RESET}`;

function exampleLines(canonical: string): string[] {
  const examples = own(HELP_EXAMPLES, canonical) ?? [];
  if (!examples.length) return [`    There are no examples for ${canonical}.`, ""];
  return examples.flatMap(([code, remarks], index) => [
    `    ${`-------------------------- EXAMPLE ${index + 1} --------------------------`}`,
    "",
    `    PS C:\\> ${code}`,
    "",
    `    ${remarks}`,
    "",
  ]);
}

function parameterLines(spec: CommandSpec): string[] {
  const parameters = syntaxParameters(spec.syntax);
  if (!parameters.length) return ["    This command has no named parameters.", ""];
  return parameters.flatMap((parameter) => [`    -${parameter.name} ${parameter.type ? (parameter.type.startsWith("<") ? parameter.type : `<${parameter.type}>`) : "[<SwitchParameter>]"}`, ""]);
}

/** One command's help. The default view is the long-standing NAME, SYNOPSIS, SYNTAX and ALIASES. */
function commandHelp(canonical: string, detail: HelpDetail): string[] {
  const spec = COMMANDS[canonical];
  const nameAndSynopsis = ["", heading("NAME"), `    ${canonical}`, "", heading("SYNOPSIS"), `    ${spec.synopsis}`, ""];
  const syntax = [heading("SYNTAX"), `    ${spec.syntax}`];
  const aliases = spec.aliases.length ? ["", heading("ALIASES"), `    ${spec.aliases.join(", ")}`] : [];

  if (detail === "examples") return [...nameAndSynopsis, heading("EXAMPLES"), ...exampleLines(canonical)];
  if (detail === "default") return [...nameAndSynopsis, ...syntax, ...aliases, ""];

  return [
    ...nameAndSynopsis,
    ...syntax,
    ...aliases,
    "",
    heading("PARAMETERS"),
    ...parameterLines(spec),
    heading("EXAMPLES"),
    ...exampleLines(canonical),
    ...(detail === "full"
      ? [
          heading("NOTES"),
          "    Commands here work on the portfolio's own drive; nothing leaves your browser except",
          "    the web requests you ask for. Output is text, and also live objects for the next",
          "    command in a pipeline.",
          "",
        ]
      : []),
  ];
}

/** What `command -?` prints: the default help, and where to read more. */
function helpForQuestionMark(canonical: string): string[] {
  return [
    ...commandHelp(canonical, "default"),
    heading("REMARKS"),
    `    To see the examples, type: "Get-Help ${canonical} -Examples".`,
    `    For more information, type: "Get-Help ${canonical} -Detailed".`,
    `    For technical information, type: "Get-Help ${canonical} -Full".`,
    "",
  ];
}

function topicHelp(topic: AboutTopic): string[] {
  return [
    "",
    heading("TOPIC"),
    `    ${topic.name}`,
    "",
    heading("SHORT DESCRIPTION"),
    `    ${topic.synopsis}`,
    "",
    heading("LONG DESCRIPTION"),
    ...topic.body.map((line) => (line ? `    ${line}` : "")),
    "",
  ];
}

const getHelp: CommandFn = (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { switches: ["Examples", "Detailed", "Full", "Online", "ShowWindow"], params: ["Name"] });
  if (parsed.unknown.length) return unknownParameter(ctx, name, parsed);
  const topic = parsed.params.Name ?? parsed.positional[0];
  if (!topic) return ok(HELP_OVERVIEW);
  if (parsed.switches.has("Online")) {
    return fail(ctx, name, `Online help is not available in this terminal. Try: Get-Help ${topic} -Examples`);
  }
  const detail: HelpDetail = parsed.switches.has("Full") ? "full" : parsed.switches.has("Detailed") ? "detailed" : parsed.switches.has("Examples") ? "examples" : "default";
  const notFound = () => fail(ctx, name, `Get-Help could not find ${topic} in a help file in this session.`);

  const show = (matchName: string): Output => {
    const aboutTopic = findAboutTopic(matchName);
    return ok(aboutTopic ? topicHelp(aboutTopic) : commandHelp(matchName, detail));
  };

  if (/[*?]/.test(topic)) {
    const pattern = wildcardRegex(topic);
    const matches = [
      ...Object.keys(COMMANDS).filter((entry) => pattern.test(entry)).map((entry) => ({ entry, category: entry.includes("-") ? "Cmdlet" : "Function", synopsis: COMMANDS[entry].synopsis })),
      ...ABOUT_TOPICS.filter((entry) => pattern.test(entry.name)).map((entry) => ({ entry: entry.name, category: "HelpFile", synopsis: entry.synopsis })),
    ].sort((a, b) => a.entry.localeCompare(b.entry));
    if (!matches.length) return notFound();
    if (matches.length === 1) return show(matches[0].entry);
    const objects = matches.map((match) => createObject("HelpInfo", { Name: match.entry, Category: match.category, Synopsis: match.synopsis }, match.entry));
    return { out: formatTableView(objects), ok: true, objects };
  }

  const aboutTopic = findAboutTopic(topic);
  if (aboutTopic) return ok(topicHelp(aboutTopic));
  const canonical = COMMAND_LOOKUP.get(topic.toLowerCase());
  return canonical ? show(canonical) : notFound();
};

COMMANDS["Get-Command"] = { aliases: ["gcm"], synopsis: "List available commands.", syntax: "Get-Command [[-Name] <string>] [-CommandType Alias|Cmdlet|Function|Application|All]", run: getCommand };
COMMANDS["Get-Alias"] = { aliases: ["gal", "alias"], synopsis: "List command aliases.", syntax: "Get-Alias", run: getAlias };
COMMANDS["Get-Help"] = { aliases: ["help", "man"], synopsis: "Show help for the shell or a command.", syntax: "Get-Help [[-Name] <string>] [-Examples] [-Detailed] [-Full]", run: getHelp };
["Get-Command", "Get-Alias", "Get-Help"].forEach((canonical) => {
  COMMAND_LOOKUP.set(canonical.toLowerCase(), canonical);
  COMMANDS[canonical].aliases.forEach((alias) => COMMAND_LOOKUP.set(alias.toLowerCase(), canonical));
});

Object.entries(EXTRA_COMMANDS).forEach(([canonical, spec]) => {
  COMMANDS[canonical] = spec;
  COMMAND_LOOKUP.set(canonical.toLowerCase(), canonical);
  spec.aliases.forEach((alias) => COMMAND_LOOKUP.set(alias.toLowerCase(), canonical));
});

// ------------------------------------------------------------------ execution

const MAX_SCRIPT_DEPTH = 4;
const MAX_SCRIPT_LINES = 500;

/** Run a .ps1 file from the virtual drive, line by line, through this same interpreter. */
async function runScript(path: string, ctx: Ctx): Promise<Output> {
  if (ctx.depth >= MAX_SCRIPT_DEPTH) return fail(ctx, getPathName(path), "The script failed due to call depth overflow.");
  const node = ctx.fs.getNodes()[path];
  const text = node ? textContent(node) : null;
  if (text === null) return fail(ctx, getPathName(path), `Cannot read the script '${toDisplayPath(path)}'.`);

  let okay = true;
  const lines = text.split(/\r?\n/).slice(0, MAX_SCRIPT_LINES);
  for (const line of lines) {
    checkInterrupt(ctx);
    if (!line.trim() || line.trim().startsWith("#")) continue;
    // eslint-disable-next-line no-await-in-loop
    const result = await runShellCommand(line, ctx.session, ctx.fs, ctx.host, ctx.depth + 1);
    if (result.clear) {
      ctx.clear = true;
      ctx.lines.length = 0;
    }
    ctx.lines.push(...result.lines);
    ctx.actions.push(...result.actions);
    okay &&= result.success;
    if (result.interrupted) throw new InterruptedError("The command was interrupted.");
  }
  return { out: [], ok: okay };
}

async function runStage(argv: string[], stdin: string[] | null, ctx: Ctx, quotedHead = false): Promise<Output> {
  // The call (&) and dot-source (.) operators just run what follows.
  const words = (argv[0] === "&" || argv[0] === ".") && argv.length > 1 ? argv.slice(1) : argv;
  const [rawName, ...args] = words;
  const key = rawName.toLowerCase();

  // PowerShell ships cd.. and cd\ as built-in functions.
  if (key === "cd.." || key === "cd\\" || key === "cd/") {
    return setLocation(key === "cd.." ? [".."] : ["~"], stdin, ctx, "Set-Location");
  }

  const canonical = COMMAND_LOOKUP.get(key);
  // `ls -?` asks for help, as `Get-Help ls` does.
  if (canonical && args.length === 1 && args[0] === "-?") return ok(helpForQuestionMark(canonical));
  if (canonical) return COMMANDS[canonical].run(args, stdin, ctx, canonical);

  if (/^ms-settings:./.test(key)) return openSettingsUri(rawName, ctx);

  const executable = key.replace(/\.exe$/, "");
  if (own(EXECUTABLES, executable) || PYTHON_NAMES.has(executable)) return launchExecutable(executable, args, ctx, true);

  if (/[\\/.]/.test(rawName)) {
    const nodes = ctx.fs.getNodes();
    const path = resolveShellPath(rawName, ctx.session.cwd, nodes);
    if (nodes[path]) {
      if (/\.ps1$/i.test(path)) return runScript(path, ctx);
      // Typing a path to a document opens it, as in PowerShell.
      ctx.actions.push({ type: "open-path", path });
      return ok();
    }
  }

  // 'some text' | ConvertFrom-Json: a quoted word that names nothing is a value, not a misspelt command.
  if (quotedHead && words.length === 1) return ok([rawName]);

  return fail(
    ctx,
    rawName,
    `The term '${rawName}' is not recognized as a name of a cmdlet, function, script file, or executable program.\nCheck the spelling of the name, or if a path was included, verify that the path is correct and try again.`
  );
}

async function runPipeline(input: string, ctx: Ctx, capture = false): Promise<{ out: string[]; ok: boolean; objects?: PipelineItem[] }> {
  const parsed = parseStatements(tokenize(input));

  if (typeof parsed === "string") {
    fail(ctx, "ParserError", parsed);
    return { out: [], ok: false };
  }

  const collected: string[] = [];
  let lastObjects: PipelineItem[] | undefined;
  // `;` separates statements that each must work; && and || chain statements into a group
  // whose outcome is that of the last one that ran, as in PowerShell 7.
  let success = true;
  let groupOk = true;

  for (const statement of parsed) {
    if (!statement.chain) {
      success &&= groupOk;
      groupOk = true;
    } else if ((statement.chain === "&&" && !groupOk) || (statement.chain === "||" && groupOk)) {
      continue;
    }

    const expanded = expandStatement(statement, ctx);
    let stdin: string[] | null = null;
    let output: Output = ok();

    for (let index = 0; index < expanded.stages.length; index += 1) {
      checkInterrupt(ctx);
      // Object-aware stages read what the previous one produced as live objects; the rest read its text.
      ctx.input = index > 0 ? (output.objects ?? null) : null;
      // eslint-disable-next-line no-await-in-loop
      output = await runStage(expanded.stages[index], stdin, ctx, statement.stages[index][0]?.quoted === true);
      if (index < expanded.stages.length - 1) stdin = output.out.map(stripAnsi);
    }
    ctx.input = null;

    if (expanded.redirect) {
      // eslint-disable-next-line no-await-in-loop
      const written = await writeContent(ctx, "Out-File", expanded.redirect.target, output.out, expanded.redirect.append);
      groupOk = output.ok && written.ok;
      lastObjects = undefined;
    } else {
      collected.push(...output.out);
      groupOk = output.ok;
      lastObjects = output.objects;
    }
    // Recorded as each statement ends, so the next one (and $?) sees it.
    ctx.session.lastSuccess = groupOk;
    ctx.session.lastExitCode = groupOk ? 0 : 1;
    // Output and errors appear in the order the statements ran, unless a caller is capturing the output.
    if (!capture) ctx.lines.push(...collected.splice(0));
  }
  return { out: collected, ok: success && groupOk, objects: lastObjects };
}

const ASSIGNMENT = /^\$([A-Za-z_][A-Za-z0-9_]*)\s*(\+=|-=|=)\s*(.*)$/;

/** Run one line the person entered. Resolves with what to print, the actions to carry out, and whether it worked. */
export async function runShellCommand(
  input: string,
  session: ShellSession,
  fs: ShellFileSystem,
  host: ShellHost = {},
  depth = 0
): Promise<ShellResult> {
  const ctx: Ctx = { session, fs, host, depth, lines: [], actions: [], clear: false, budget: { steps: 0 }, input: null };

  try {
    const result = await runLine(input, ctx);
    session.lastSuccess = result.success;
    if (result.lines.length <= MAX_OUTPUT_LINES) return result;
    return { ...result, lines: [...result.lines.slice(0, MAX_OUTPUT_LINES), `${RED}Output stopped after ${MAX_OUTPUT_LINES} lines.${RESET}`] };
  } catch (error) {
    // Ctrl+C: whatever the command had printed is dropped, and the app writes ^C.
    if (error instanceof InterruptedError) return { lines: [], clear: false, actions: [], success: false, interrupted: true };
    throw error;
  }
}

async function runLine(input: string, ctx: Ctx): Promise<ShellResult> {
  const { session } = ctx;
  const trimmed = input.trim();

  // $name = value, $name += value: the value is an expression, or the output of a command.
  const assignment = trimmed.match(ASSIGNMENT);
  if (assignment && !assignment[3].startsWith("=")) {
    const [, rawName, operator, rhs] = assignment;
    const name = rawName.toLowerCase();
    if (["true", "false", "null", "home", "pwd", "host", "psversiontable"].includes(name)) {
      fail(ctx, "SessionStateUnauthorizedAccessException", `Cannot overwrite variable ${rawName} because it is read-only or constant.`);
      return { lines: ctx.lines, clear: false, actions: [], success: false };
    }

    const evaluated = evaluateExpression(rhs, ctx);
    let value: ShellValue;
    if (evaluated && "error" in evaluated) {
      fail(ctx, "RuntimeException", evaluated.error);
      return { lines: ctx.lines, clear: false, actions: [], success: false };
    } else if (evaluated) {
      value = evaluated.value;
    } else {
      const piped = await runPipeline(rhs, ctx, true);
      // New-Guid and Resolve-Path print a table but hand a variable just their value.
      const scalars = piped.objects?.filter((item): item is ShellObject => isShellObject(item) && item.view === "scalar");
      const lines = scalars?.length && scalars.length === piped.objects?.length
        ? scalars.map((item) => item.text)
        : piped.out.map(stripAnsi).filter((line) => line.trim() !== "");
      value = lines.length === 1 ? lines[0] : lines;
    }

    const current = own(session.variables, name);
    try {
      session.variables[name] =
        operator === "=" || current === undefined ? value : applyArithmetic(operator === "+=" ? "+" : "-", current, value);
    } catch (error) {
      fail(ctx, "RuntimeException", (error as Error).message);
      return { lines: ctx.lines, clear: false, actions: [], success: false };
    }
    return { lines: ctx.lines, clear: ctx.clear, actions: ctx.actions, success: true };
  }

  // $PSVersionTable prints as a table, the way PowerShell shows it.
  if (/^\$psversiontable$/i.test(trimmed)) {
    return { lines: PS_VERSION_TABLE(), clear: false, actions: [], success: true };
  }

  // $PSVersionTable.PSVersion and other objects reached by member access.
  const reached = memberObject(trimmed, ctx);
  if (reached) return { lines: renderItems([reached]), clear: false, actions: [], success: true };

  // A line that is an expression (2 + 2, "Hello $name", $x * 3, 5 -gt 3) is evaluated and printed.
  if (/^[\d("'$.-]/.test(trimmed) && !/^-[A-Za-z]/.test(trimmed)) {
    const evaluated = evaluateExpression(trimmed, ctx);
    if (evaluated && "error" in evaluated) {
      fail(ctx, "RuntimeException", evaluated.error);
      return { lines: ctx.lines, clear: false, actions: [], success: false };
    }
    if (evaluated) {
      return { lines: formatValue(evaluated.value), clear: false, actions: [], success: true };
    }
  }

  const result = await runPipeline(input, ctx);
  ctx.lines.push(...result.out);
  return { lines: ctx.lines, clear: ctx.clear, actions: ctx.actions, success: result.ok };
}

// ----------------------------------------------------------------- completion

export interface CompletionResult {
  line: string;
  cursor: number;
  candidates: string[];
}

const COMPLETABLE_COMMANDS = () =>
  Array.from(
    new Set([...Object.keys(COMMANDS), ...Object.values(COMMANDS).flatMap((spec) => spec.aliases), ...Object.keys(EXECUTABLES)])
  );

function commonPrefix(values: string[]) {
  if (!values.length) return "";
  let prefix = values[0];
  for (const value of values.slice(1)) {
    let index = 0;
    while (index < prefix.length && index < value.length && prefix[index].toLowerCase() === value[index].toLowerCase()) index += 1;
    prefix = prefix.slice(0, index);
  }
  return prefix;
}

export interface CompletionOptions {
  /** Command names to complete; PowerShell's own by default. */
  commands?: string[];
  /** Characters that start a new command on the line. */
  separators?: string;
  /** The quote characters the shell knows, and the first is what a name with spaces is wrapped in. PowerShell: '" with '. */
  quotes?: string;
  /** Complete -Parameter names from the command's syntax. Off for a shell whose options look different. */
  parameters?: boolean;
}

/** The parameter names of the command the stage at `stageText` starts with, in the syntax's own spelling. */
function stageParameters(stageText: string): { used: string[]; names: string[] } | null {
  const words = stageText.trim().split(/\s+/).filter(Boolean);
  // The call (&) and dot-source (.) operators come before the command's name.
  while (words.length && (words[0] === "&" || words[0] === ".")) words.shift();
  if (!words.length) return null;
  const canonical = COMMAND_LOOKUP.get(words[0].toLowerCase());
  if (!canonical) return null;
  return {
    used: words.slice(1).map((word) => word.toLowerCase().split(":")[0]),
    names: syntaxParameters(COMMANDS[canonical].syntax).map((parameter) => parameter.name),
  };
}

/** Tab completion for the word at the cursor: command names first, then parameters and paths. */
export function completeShellInput(
  line: string,
  cursor: number,
  session: ShellSession,
  nodes: FileSystemRecord,
  options: CompletionOptions = {}
): CompletionResult {
  const separators = options.separators ?? "|;&";
  const quotes = options.quotes ?? "'\"";
  const before = line.slice(0, cursor);
  let start = 0;
  let stageStart = 0;
  let quote: string | null = null;

  for (let index = 0; index < before.length; index += 1) {
    const char = before[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (quotes.includes(char)) {
      quote = char;
      continue;
    }
    if (/\s/.test(char) || separators.includes(char)) start = index + 1;
    if (separators.includes(char)) stageStart = index + 1;
  }

  const rawToken = before.slice(start);
  const quoted = quotes.includes(rawToken[0] ?? "\0");
  const token = quoted ? rawToken.slice(1) : rawToken;
  const head = before.slice(0, start).trimEnd();
  const commandPosition = head === "" || [...separators].some((separator) => head.endsWith(separator));

  let matches: Array<{ text: string; display: string }>;
  let isCommand = false;
  let isParameter = false;

  const parameters = options.parameters !== false && !quoted && !commandPosition && token.startsWith("-") ? stageParameters(before.slice(stageStart, start)) : null;

  if (parameters) {
    isParameter = true;
    const lower = token.toLowerCase();
    matches = parameters.names
      .filter((entry) => `-${entry}`.toLowerCase().startsWith(lower) && !parameters.used.includes(`-${entry}`.toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
      .map((entry) => ({ text: `-${entry}`, display: `-${entry}` }));
  } else if (commandPosition && token !== "" && !/[\\/]/.test(token) && !token.startsWith(".") && !quoted) {
    isCommand = true;
    const lower = token.toLowerCase();
    matches = (options.commands ?? COMPLETABLE_COMMANDS())
      .filter((name) => name.toLowerCase().startsWith(lower))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ text: name, display: name }));
  } else {
    const normalized = token.replace(/\//g, "\\");
    const separator = normalized.lastIndexOf("\\");
    const directoryPart = separator >= 0 ? normalized.slice(0, separator + 1) : "";
    const prefix = (separator >= 0 ? normalized.slice(separator + 1) : normalized).toLowerCase();
    const directory = resolveShellPath(directoryPart || ".", session.cwd, nodes);
    matches = childrenOf(nodes, directory)
      // A name with control characters in it is never offered: it would put them in the line being typed.
      .filter((node) => node.path !== TRASH_PATH && !hasControlCharacters(node.name) && node.name.toLowerCase().startsWith(prefix))
      .map((node) => {
        const suffix = node.kind === "directory" ? "\\" : "";
        return { text: `${directoryPart}${node.name}${suffix}`, display: `${node.name}${suffix}` };
      });
  }

  if (!matches.length) return { line, cursor, candidates: [] };

  // A name with a space is wrapped in the shell's own quote; one the person already opened keeps its quote.
  const quoteChar = quoted ? rawToken[0] : quotes[0];
  const replace = (value: string, close: boolean) => {
    const needsQuotes = quoted || /\s/.test(value);
    const replacement = needsQuotes ? `${quoteChar}${value}${close ? quoteChar : ""}` : value;
    const trailing = (isCommand || isParameter) && close ? " " : "";
    const nextLine = `${line.slice(0, start)}${replacement}${trailing}${line.slice(cursor)}`;
    return { line: nextLine, cursor: start + replacement.length + trailing.length, candidates: [] };
  };

  if (matches.length === 1) return replace(matches[0].text, true);

  const shared = commonPrefix(matches.map((match) => match.text));
  if (shared.length > token.replace(/\//g, "\\").length) return replace(shared, false);

  return { line, cursor, candidates: matches.map((match) => match.display) };
}

// ------------------------------------------------------------- highlighting

/** PSReadLine's default token colours. */
const SYNTAX = {
  command: `${CSI}93m`,
  parameter: `${CSI}90m`,
  string: `${CSI}36m`,
  variable: `${CSI}92m`,
  number: `${CSI}97m`,
  operator: `${CSI}90m`,
  comment: `${CSI}32m`,
};

/**
 * Colour the line being typed the way PSReadLine does. Only escape codes are
 * added, so the visible text - and therefore cursor maths - is unchanged.
 */
export function highlightShellInput(line: string) {
  let out = "";
  let index = 0;
  let expectCommand = true;

  while (index < line.length) {
    const char = line[index];

    if (/\s/.test(char)) {
      out += char;
      index += 1;
      continue;
    }

    if (char === "#") {
      out += `${SYNTAX.comment}${line.slice(index)}${RESET}`;
      break;
    }

    if (char === "'" || char === '"') {
      let end = index + 1;
      while (end < line.length && line[end] !== char) end += 1;
      end = Math.min(line.length, end + 1);
      out += `${SYNTAX.string}${line.slice(index, end)}${RESET}`;
      index = end;
      expectCommand = false;
      continue;
    }

    if (char === "|" || char === ";") {
      out += `${SYNTAX.operator}${char}${RESET}`;
      index += 1;
      expectCommand = true;
      continue;
    }

    if (char === "&" && line[index + 1] === "&") {
      out += `${SYNTAX.operator}&&${RESET}`;
      index += 2;
      expectCommand = true;
      continue;
    }

    if (char === ">") {
      const end = line[index + 1] === ">" ? index + 2 : index + 1;
      out += `${SYNTAX.operator}${line.slice(index, end)}${RESET}`;
      index = end;
      continue;
    }

    let end = index;
    while (end < line.length && !/[\s|;>'"]/.test(line[end]) && !(line[end] === "&" && line[end + 1] === "&")) end += 1;
    const word = line.slice(index, end);
    let colour = "";
    if (word.startsWith("$")) colour = SYNTAX.variable;
    else if (/^-?\d+(\.\d+)?([kmgt]b)?$/i.test(word)) colour = SYNTAX.number;
    else if (expectCommand) colour = SYNTAX.command;
    else if (/^-[A-Za-z]/.test(word)) colour = SYNTAX.parameter;
    else if (/^[=+*/%-]+$/.test(word)) colour = SYNTAX.operator;

    out += colour ? `${colour}${word}${RESET}` : word;
    expectCommand = false;
    index = end;
  }

  return out;
}

/** The newest history entry that extends what has been typed, as PSReadLine's inline prediction shows it. */
export function predictFromHistory(line: string, history: string[]) {
  if (!line.trim()) return "";
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    if (entry.length > line.length && entry.startsWith(line)) return entry.slice(line.length);
  }
  return "";
}
