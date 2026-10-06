import { featuredProjects, profile, socialLinks } from "@/data/portfolio";
import { getParentPath, getPathName, normalizePath } from "@/lib/filesystem";
import { TRASH_PATH } from "@/lib/system-workspace";
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

export function formatPrompt(cwd: string) {
  return `PS ${toWindowsPath(cwd)}> `;
}

// --------------------------------------------------------------------- types

export type TerminalAction =
  | { type: "launch-app"; appId: AppId; payload?: WindowPayload; title?: string }
  | { type: "open-path"; path: string }
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

export type ShellValue = string | number | boolean | string[];

export interface ShellSession {
  cwd: string;
  previousCwd: string | null;
  history: string[];
  /** $name = value assignments made in this session. Keys are lower-case. */
  variables: Record<string, ShellValue>;
  /** Push-Location / Pop-Location stack. */
  locationStack: string[];
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
export interface ShellHost {
  listProcesses?: () => ShellProcessInfo[];
  stopProcess?: (id: string) => void;
  readClipboard?: () => Promise<string>;
  writeClipboard?: (text: string) => Promise<void>;
  fetch?: typeof fetch;
}

export interface ShellResult {
  lines: string[];
  clear: boolean;
  actions: TerminalAction[];
  success: boolean;
}

export function createShellSession(cwd = TERMINAL_HOME_PATH): ShellSession {
  return { cwd: normalizePath(cwd), previousCwd: null, history: [], variables: {}, locationStack: [] };
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
}

interface Output {
  out: string[];
  ok: boolean;
}

type CommandFn = (args: string[], stdin: string[] | null, ctx: Ctx, name: string) => Promise<Output> | Output;

interface CommandSpec {
  aliases: string[];
  synopsis: string;
  syntax: string;
  run: CommandFn;
}

const ok = (out: string[] = []): Output => ({ out, ok: true });

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

function fail(ctx: Ctx, command: string, message: string): Output {
  sanitizeForTerminal(message)
    .split("\n")
    .forEach((line, index) => {
      ctx.lines.push(`${RED}${index === 0 ? `${command}: ` : ""}${line}${RESET}`);
    });
  return { out: [], ok: false };
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
  return path.startsWith(prefix) ? path.slice(prefix.length).replace(/\//g, "\\") : toWindowsPath(path);
}

function isInside(path: string, ancestor: string) {
  return path === ancestor || path.startsWith(ancestor === "/" ? "/" : `${ancestor}/`);
}

function hasReadonly(nodes: FileSystemRecord, path: string) {
  return Object.values(nodes).some(
    (node) => isInside(node.path, path) && node.kind === "file" && node.readonly === true
  );
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

type Token = { kind: "word"; value: string; literal: boolean } | { kind: "op"; value: "|" | ";" | ">" | ">>" };

function unescapeBacktick(char: string) {
  if (char === "n") return "\n";
  if (char === "t") return "\t";
  if (char === "0") return "";
  return char;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let current = "";
  let inWord = false;
  let literal = false;
  let i = 0;

  const flush = () => {
    if (inWord) tokens.push({ kind: "word", value: current, literal });
    current = "";
    inWord = false;
    literal = false;
  };

  while (i < input.length) {
    const char = input[i];

    if (char === "'") {
      inWord = true;
      literal = true;
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
    pwd: toWindowsPath(ctx.session.cwd),
  };
}

/** Look up $name: environment, automatic variables, then the session's own. */
function readVariable(rawName: string, ctx: Ctx): ShellValue | undefined {
  const name = rawName.toLowerCase();
  if (name.startsWith("env:")) return environment(ctx)[name.slice(4)];
  switch (name) {
    case "home":
      return PROFILE_ROOT;
    case "pwd":
      return toWindowsPath(ctx.session.cwd);
    case "true":
      return true;
    case "false":
      return false;
    case "null":
      return "";
    case "host":
      return `Taaniel OS terminal (PowerShell ${POWERSHELL_VERSION})`;
    default:
      return ctx.session.variables[name];
  }
}

function expandVariables(word: string, ctx: Ctx) {
  return word.replace(/\$(env:)?([A-Za-z_][A-Za-z0-9_]*)/gi, (_match, env: string | undefined, name: string) => {
    const value = readVariable(`${env ?? ""}${name}`, ctx);
    if (value === undefined) return "";
    return Array.isArray(value) ? value.join(" ") : typeof value === "boolean" ? (value ? "True" : "False") : String(value);
  });
}

interface Statement {
  stages: string[][];
  redirect?: { append: boolean; target: string };
}

function parseStatements(tokens: Token[], ctx: Ctx): Statement[] | string {
  const statements: Statement[] = [];
  let stages: string[][] = [[]];
  let redirect: Statement["redirect"];

  const closeStatement = () => {
    const meaningful = stages.some((stage) => stage.length > 0);
    if (meaningful) statements.push({ stages, redirect });
    stages = [[]];
    redirect = undefined;
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.kind === "word") {
      stages[stages.length - 1].push(token.literal ? token.value : expandVariables(token.value, ctx));
      continue;
    }

    if (token.value === ";") {
      if (stages.some((stage) => stage.length === 0) && stages.length > 1) return "An empty pipe element is not allowed.";
      closeStatement();
      continue;
    }

    if (token.value === "|") {
      if (stages[stages.length - 1].length === 0) return "An empty pipe element is not allowed.";
      stages.push([]);
      continue;
    }

    const target = tokens[index + 1];
    if (!target || target.kind !== "word") return "Missing file specification after redirection operator.";
    redirect = { append: token.value === ">>", target: target.literal ? target.value : expandVariables(target.value, ctx) };
    index += 1;
  }

  if (stages.length > 1 && stages[stages.length - 1].length === 0) return "An empty pipe element is not allowed.";
  closeStatement();
  return statements;
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

function formatTable(directoryPath: string, entries: VirtualNode[], nameOnly = false) {
  if (nameOnly) return entries.map((node) => sanitizeForTerminal(node.name));

  const header = `${"Mode".padEnd(15)}${"LastWriteTime".padStart(19)}${"Length".padStart(15)} Name`;
  const rule = `${"----".padEnd(15)}${"-------------".padStart(19)}${"------".padStart(15)} ----`;
  const rows = entries.map((node) => {
    const hidden = node.path === TRASH_PATH;
    const safeName = sanitizeForTerminal(node.name);
    const name = node.kind === "directory" ? `${DIRECTORY}${safeName}${RESET}` : safeName;
    return `${modeOf(node, hidden).padEnd(15)}${formatWriteTime(node.updatedAt)} ${fileLength(node).padStart(14)} ${name}`;
  });

  return ["", `    Directory: ${toWindowsPath(directoryPath)}`, "", `${TABLE}${header}${RESET}`, `${TABLE}${rule}${RESET}`, ...rows, ""];
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

async function launchExecutable(name: string, args: string[], ctx: Ctx): Promise<Output> {
  const appId = EXECUTABLES[name];
  const target = args.find((arg) => !arg.startsWith("-"));

  if (appId === "v86") {
    ctx.actions.push({ type: "launch-app", appId });
    return ok(["Starting the Linux virtual machine (v86 - a real x86 emulator running in your browser)…"]);
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
      return fail(ctx, name, `Cannot find path '${toWindowsPath(path)}' because it does not exist.`);
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
  let okay = true;

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

  const listDirectory = (directoryPath: string) => {
    const entries = filterEntries(childrenOf(nodes, directoryPath));
    if (entries.length) out.push(...formatTable(directoryPath, entries, parsed.switches.has("Name")));
    if (parsed.switches.has("Recurse")) {
      childrenOf(nodes, directoryPath)
        .filter((node) => node.kind === "directory" && node.path !== TRASH_PATH)
        .forEach((node) => listDirectory(node.path));
    }
  };

  if (targets.length && resolved.length === 0) return ok();

  for (const { path } of resolved) {
    const node = nodes[path];
    if (!node) {
      fail(ctx, name, `Cannot find path '${toWindowsPath(path)}' because it does not exist.`);
      okay = false;
      continue;
    }
    if (node.kind === "directory") listDirectory(path);
    else out.push(...formatTable(getParentPath(path), [node], parsed.switches.has("Name")));
  }

  return { out, ok: okay };
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
    return fail(ctx, name, `Cannot find path '${toWindowsPath(path)}' because it does not exist.`);
  }

  if (path !== ctx.session.cwd) {
    ctx.session.previousCwd = ctx.session.cwd;
    ctx.session.cwd = path;
  }
  return ok();
};

const getLocation: CommandFn = (_args, _stdin, ctx) =>
  ok(["", `${TABLE}Path${RESET}`, `${TABLE}----${RESET}`, toWindowsPath(ctx.session.cwd), ""]);

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
      fail(ctx, name, `Cannot find path '${toWindowsPath(path)}' because it does not exist.`);
      okay = false;
      continue;
    }
    if (node.kind === "directory") {
      fail(ctx, name, `Unable to get content because it is a directory: '${toWindowsPath(path)}'. Please use 'Get-ChildItem' instead.`);
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
  const display = toWindowsPath(path);

  if (path === "/") return fail(ctx, name, `An item with the specified name ${display} already exists.`);

  if (existing && !(force && kind === "file" && existing.kind === "file")) {
    return fail(ctx, name, `An item with the specified name ${display} already exists.`);
  }

  if (kind === "directory") {
    if (!(await ensureDirectory(ctx, path))) {
      return fail(ctx, name, `An item with the specified name ${toWindowsPath(getParentPath(path))} already exists.`);
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
    const display = toWindowsPath(path);

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
    if (hasReadonly(nodes, path)) {
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
      fail(ctx, name, `Cannot find path '${toWindowsPath(source)}' because it does not exist.`);
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
        fail(ctx, name, `Could not find a part of the path '${toWindowsPath(destination)}'.`);
        okay = false;
        continue;
      }
    }

    if (node.kind === "directory" && isInside(targetDirectory, source)) {
      fail(ctx, name, `Destination path cannot be a subdirectory of the source: ${toWindowsPath(joinVirtual(targetDirectory, targetName))}.`);
      okay = false;
      continue;
    }

    if (operation === "cut") {
      if (source === "/" || source === TRASH_PATH || hasReadonly(nodes, source)) {
        fail(ctx, name, `Access to the path '${toWindowsPath(source)}' is denied.`);
        okay = false;
        continue;
      }
      if (isInside(ctx.session.cwd, source)) {
        fail(ctx, name, `Cannot move item because the item at '${toWindowsPath(source)}' is in use.`);
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
      fail(ctx, name, `Access to the path '${toWindowsPath(source)}' is denied.`);
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
  if (!node) return fail(ctx, name, `Cannot rename because item at '${toWindowsPath(path)}' does not exist.`);
  if (path === "/" || path === TRASH_PATH || hasReadonly(nodes, path)) {
    return fail(ctx, name, `Access to the path '${toWindowsPath(path)}' is denied.`);
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
  const display = toWindowsPath(path);
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
    ...ctx.session.history.map((entry, index) => `${String(index + 1).padStart(width)} ${entry}`),
    "",
  ]);
};

const startProcess: CommandFn = async (args, _stdin, ctx, name) => {
  const parsed = parseArgs(args, { params: ["FilePath", "ArgumentList", "Path"] });
  const target = parsed.params.FilePath ?? parsed.params.Path ?? parsed.positional[0];
  const rest = parsed.params.ArgumentList ? [parsed.params.ArgumentList] : parsed.positional.slice(1);

  if (!target) return fail(ctx, name, "Cannot bind argument to parameter 'FilePath' because it is null.");

  if (isUrl(target)) return launchExecutable("msedge", [target], ctx);

  const executable = target.toLowerCase().replace(/\.exe$/, "");
  if (EXECUTABLES[executable]) return launchExecutable(executable, rest, ctx);

  const nodes = ctx.fs.getNodes();
  const path = resolveShellPath(target, ctx.session.cwd, nodes);
  if (nodes[path]) {
    ctx.actions.push({ type: "open-path", path });
    return ok();
  }

  const shortcut = PATH_SHORTCUTS[target.toLowerCase()];
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
  if (!node || node.kind !== "directory") return fail(ctx, name, `Invalid path - ${toWindowsPath(path).toUpperCase()}`);

  const body = treeLines(nodes, path, "", switches.includes("/F"), switches.includes("/A"));
  const hasFolders = childrenOf(nodes, path).some((child) => child.kind === "directory" && child.path !== TRASH_PATH);
  return ok([
    "Folder PATH listing for volume Taaniel OS",
    "Volume serial number is 7A1C-3E5D",
    toWindowsPath(path).toUpperCase(),
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
        fail(ctx, name, `Cannot find path '${toWindowsPath(path)}' because it does not exist.`);
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

const sortObject: CommandFn = (args, stdin) => {
  const parsed = parseArgs(args, { switches: ["Descending", "Unique", "CaseSensitive"] });
  let lines = [...(stdin ?? [])].filter((line) => line.trim().length > 0);
  lines.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: parsed.switches.has("CaseSensitive") ? "case" : "base" }));
  if (parsed.switches.has("Descending")) lines.reverse();
  if (parsed.switches.has("Unique")) lines = lines.filter((line, index) => lines.findIndex((other) => other.toLowerCase() === line.toLowerCase()) === index);
  return ok(lines);
};

const selectObject: CommandFn = (args, stdin) => {
  const parsed = parseArgs(args, { params: ["First", "Last", "Skip"] });
  let lines = [...(stdin ?? [])];
  const skip = Number(parsed.params.Skip);
  const first = Number(parsed.params.First);
  const last = Number(parsed.params.Last);
  if (Number.isFinite(skip)) lines = lines.slice(skip);
  if (Number.isFinite(first)) lines = lines.slice(0, first);
  if (Number.isFinite(last)) lines = last === 0 ? [] : lines.slice(-last);
  return ok(lines);
};

const measureObject: CommandFn = (args, stdin) => {
  const parsed = parseArgs(args, { switches: ["Line", "Word", "Character"] });
  const lines = (stdin ?? []).filter((line) => line.length > 0);
  if (parsed.switches.has("Line") || parsed.switches.has("Word") || parsed.switches.has("Character")) {
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
};

const getDate: CommandFn = () =>
  ok(["", new Intl.DateTimeFormat([], { dateStyle: "full", timeStyle: "medium" }).format(new Date()), ""]);

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
 * A small, hand-written PowerShell expression evaluator: numbers, strings,
 * variables, + - * / %, parentheses and -eq/-ne/-gt/-ge/-lt/-le/-like/-match/
 * -and/-or. Nothing typed here is ever handed to eval() or new Function().
 */

type ExprToken =
  | { t: "num"; v: number }
  | { t: "str"; v: string; interpolate: boolean }
  | { t: "var"; v: string }
  | { t: "op"; v: string }
  | { t: "lp" }
  | { t: "rp" };

const COMPARISON_OPERATORS = ["-eq", "-ne", "-gt", "-ge", "-lt", "-le", "-like", "-notlike", "-match", "-notmatch", "-and", "-or"];
const SIZE_SUFFIX: Record<string, number> = { kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 };

function lexExpression(text: string): ExprToken[] | null {
  const tokens: ExprToken[] = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const rest = text.slice(i);

    if (/\s/.test(char)) {
      i += 1;
      continue;
    }

    const comparison = rest.match(/^-[a-z]+/i)?.[0]?.toLowerCase();
    if (comparison && COMPARISON_OPERATORS.includes(comparison)) {
      tokens.push({ t: "op", v: comparison });
      i += comparison.length;
      continue;
    }

    const number = rest.match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?(kb|mb|gb|tb)?/i);
    if (number && /[\d.]/.test(char)) {
      const suffix = number[3]?.toLowerCase();
      tokens.push({ t: "num", v: parseFloat(number[1] + (number[2] ?? "")) * (suffix ? SIZE_SUFFIX[suffix] : 1) });
      i += number[0].length;
      continue;
    }

    if (char === "'") {
      let value = "";
      i += 1;
      while (i < text.length) {
        if (text[i] === "'" && text[i + 1] === "'") {
          value += "'";
          i += 2;
        } else if (text[i] === "'") {
          break;
        } else {
          value += text[i];
          i += 1;
        }
      }
      if (text[i] !== "'") return null;
      i += 1;
      tokens.push({ t: "str", v: value, interpolate: false });
      continue;
    }

    if (char === '"') {
      let value = "";
      i += 1;
      while (i < text.length && text[i] !== '"') {
        if (text[i] === "`" && i + 1 < text.length) {
          value += unescapeBacktick(text[i + 1]);
          i += 2;
        } else {
          value += text[i];
          i += 1;
        }
      }
      if (text[i] !== '"') return null;
      i += 1;
      tokens.push({ t: "str", v: value, interpolate: true });
      continue;
    }

    const variable = rest.match(/^\$(env:)?[A-Za-z_][A-Za-z0-9_]*/i);
    if (variable) {
      tokens.push({ t: "var", v: variable[0].slice(1) });
      i += variable[0].length;
      continue;
    }

    if ("+-*/%".includes(char)) {
      tokens.push({ t: "op", v: char });
      i += 1;
      continue;
    }

    if (char === "(") {
      tokens.push({ t: "lp" });
      i += 1;
      continue;
    }

    if (char === ")") {
      tokens.push({ t: "rp" });
      i += 1;
      continue;
    }

    return null;
  }

  return tokens;
}

class ExpressionError extends Error {}

function toNumber(value: ShellValue): number {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const text = Array.isArray(value) ? value.join("") : value;
  if (text.trim() !== "" && Number.isFinite(Number(text))) return Number(text);
  throw new ExpressionError(`Cannot convert value "${text}" to type "System.Int32". Error: "Input string was not in a correct format."`);
}

function toText(value: ShellValue): string {
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return formatNumber(value);
  if (Array.isArray(value)) return value.join(" ");
  return value;
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toPrecision(15)));
}

function wildcardRegex(pattern: string) {
  return new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i");
}

function compareValues(operator: string, left: ShellValue, right: ShellValue): boolean {
  if (operator === "-and") return Boolean(left) && Boolean(right);
  if (operator === "-or") return Boolean(left) || Boolean(right);

  const numeric = typeof left === "number";
  const a = numeric ? left : toText(left).toLowerCase();
  const b = numeric ? toNumber(right) : toText(right).toLowerCase();

  switch (operator) {
    case "-eq":
      return a === b;
    case "-ne":
      return a !== b;
    case "-gt":
      return a > b;
    case "-ge":
      return a >= b;
    case "-lt":
      return a < b;
    case "-le":
      return a <= b;
    case "-like":
      return wildcardRegex(toText(right)).test(toText(left));
    case "-notlike":
      return !wildcardRegex(toText(right)).test(toText(left));
    case "-match":
    case "-notmatch": {
      let matched: boolean;
      try {
        matched = new RegExp(toText(right), "i").test(toText(left));
      } catch {
        throw new ExpressionError(`The regular expression pattern ${toText(right)} is not valid.`);
      }
      return operator === "-match" ? matched : !matched;
    }
    default:
      throw new ExpressionError(`Unexpected token '${operator}' in expression or statement.`);
  }
}

function applyArithmetic(operator: string, left: ShellValue, right: ShellValue): ShellValue {
  if (operator === "+") {
    if (Array.isArray(left)) return [...left, ...(Array.isArray(right) ? right : [toText(right)])];
    if (typeof left === "string") return left + toText(right);
    return toNumber(left) + toNumber(right);
  }
  if (operator === "*") {
    if (typeof left === "string") return left.repeat(Math.max(0, Math.floor(toNumber(right))));
    return toNumber(left) * toNumber(right);
  }
  const a = toNumber(left);
  const b = toNumber(right);
  if ((operator === "/" || operator === "%") && b === 0) throw new ExpressionError("Attempted to divide by zero.");
  if (operator === "-") return a - b;
  if (operator === "/") return a / b;
  return a % b;
}

/** Evaluate a whole line as an expression. Returns undefined when it is not one (so it runs as a command). */
function evaluateExpression(text: string, ctx: Ctx): { value: ShellValue } | { error: string } | undefined {
  const tokens = lexExpression(text);
  if (!tokens || tokens.length === 0) return undefined;
  let position = 0;

  const peek = () => tokens[position];
  const take = () => tokens[position++];

  const primary = (): ShellValue => {
    const token = take();
    if (!token) throw new ExpressionError("You must provide a value expression following the operator.");
    if (token.t === "num") return token.v;
    if (token.t === "str") return token.interpolate ? expandVariables(token.v, ctx) : token.v;
    if (token.t === "var") {
      const value = readVariable(token.v, ctx);
      return value ?? "";
    }
    if (token.t === "lp") {
      const value = comparison();
      if (take()?.t !== "rp") throw new ExpressionError("Missing closing ')' in expression.");
      return value;
    }
    throw new ExpressionError("You must provide a value expression following the operator.");
  };

  const unary = (): ShellValue => {
    const token = peek();
    if (token?.t === "op" && token.v === "-") {
      take();
      return -toNumber(unary());
    }
    return primary();
  };

  const term = (): ShellValue => {
    let value = unary();
    while (peek()?.t === "op" && ["*", "/", "%"].includes((peek() as { v: string }).v)) {
      const operator = (take() as { v: string }).v;
      value = applyArithmetic(operator, value, unary());
    }
    return value;
  };

  const additive = (): ShellValue => {
    let value = term();
    while (peek()?.t === "op" && ["+", "-"].includes((peek() as { v: string }).v)) {
      const operator = (take() as { v: string }).v;
      value = applyArithmetic(operator, value, term());
    }
    return value;
  };

  function comparison(): ShellValue {
    let value = additive();
    while (peek()?.t === "op" && COMPARISON_OPERATORS.includes((peek() as { v: string }).v)) {
      const operator = (take() as { v: string }).v;
      value = compareValues(operator, value, additive());
    }
    return value;
  }

  try {
    const value = comparison();
    if (position !== tokens.length) return undefined;
    return { value };
  } catch (error) {
    if (error instanceof ExpressionError) return { error: error.message };
    return undefined;
  }
}

function formatValue(value: ShellValue): string[] {
  if (Array.isArray(value)) return value;
  return [toText(value)];
}

const PS_VERSION_TABLE = (): string[] => {
  const rows: Array<[string, string]> = [
    ["PSVersion", POWERSHELL_VERSION],
    ["PSEdition", "Core"],
    ["GitCommitId", POWERSHELL_VERSION],
    ["OS", `Taaniel OS (${typeof navigator === "undefined" ? "browser" : navigator.userAgent.split(" ")[0]})`],
    ["Platform", "Win32NT"],
    ["PSCompatibleVersions", "{1.0, 2.0, 3.0, 4.0…}"],
    ["PSRemotingProtocolVersion", "2.3"],
    ["SerializationVersion", "1.1.0.1"],
    ["WSManStackVersion", "3.0"],
  ];
  return [
    "",
    `${TABLE}${"Name".padEnd(31)}Value${RESET}`,
    `${TABLE}${"----".padEnd(31)}-----${RESET}`,
    ...rows.map(([name, value]) => `${name.padEnd(31)}${value}`),
    "",
  ];
};

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
  const fg = parsed.params.ForegroundColor ? CONSOLE_COLORS[parsed.params.ForegroundColor.toLowerCase()] : undefined;
  const bgCode = parsed.params.BackgroundColor ? CONSOLE_COLORS[parsed.params.BackgroundColor.toLowerCase()] : undefined;
  if (parsed.params.ForegroundColor && !fg) {
    return fail(ctx, name, `Cannot bind parameter 'ForegroundColor'. Cannot convert value "${parsed.params.ForegroundColor}" to type "System.ConsoleColor".`);
  }
  const bg = bgCode ? String(Number(bgCode) + 10) : undefined;
  const text = [...(parsed.params.Object ? [parsed.params.Object] : []), ...parsed.positional, ...(stdin ?? [])].join(parsed.params.Separator ?? " ");
  const codes = [fg, bg].filter(Boolean).join(";");
  return ok([codes ? `${CSI}${codes}m${text}${RESET}` : text]);
};

/** A stable, PowerShell-looking numeric id for an OS process. */
function processNumber(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return 1000 + (hash % 9000);
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

  return ok([
    "",
    `${TABLE}${"Id".padStart(6)} ${"ProcessName".padEnd(14)} ${"Status".padEnd(10)} MainWindowTitle${RESET}`,
    `${TABLE}${"--".padStart(6)} ${"-----------".padEnd(14)} ${"------".padEnd(10)} ---------------${RESET}`,
    ...matches.map(
      (process) =>
        `${String(processNumber(process.id)).padStart(6)} ${process.name.padEnd(14)} ${(process.minimized ? "Minimized" : "Running").padEnd(10)} ${sanitizeForTerminal(process.title)}`
    ),
    "",
  ]);
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

const getComputerInfo: CommandFn = () => {
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
    ["NetworkStatus", nav?.onLine === false ? "Offline" : "Online"],
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const doFetch = ctx.host.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!doFetch) return fail(ctx, name, "This browser can't make web requests.");

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
    if ((error as Error)?.name === "AbortError") return fail(ctx, name, "The operation has timed out.");
    return fail(
      ctx,
      name,
      "Unable to connect to the remote server. Browsers only let a page read sites that allow it (CORS); APIs such as api.github.com do."
    );
  } finally {
    clearTimeout(timer);
  }
}

const invokeWebRequest: CommandFn = (args, _stdin, ctx, name) => webRequest(args, ctx, name, false);
const invokeRestMethod: CommandFn = (args, _stdin, ctx, name) => webRequest(args, ctx, name, true);

/** ICMP is impossible from a web page, so reachability is timed over HTTPS - and the output says so. */
async function timeHttps(host: string, ctx: Ctx) {
  const doFetch = ctx.host.fetch ?? globalThis.fetch?.bind(globalThis);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  const started = performance.now();
  try {
    await doFetch?.(`https://${host}/`, { mode: "no-cors", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer", signal: controller.signal });
    return Math.max(1, Math.round(performance.now() - started));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
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
  const subtleName = HASH_ALGORITHMS[algorithm.toLowerCase()];
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
      fail(ctx, name, node ? `Unable to read the file '${toWindowsPath(path)}'.` : `Cannot find path '${toWindowsPath(path)}' because it does not exist.`);
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
      ...hashes.map((entry) => `${algorithm.padEnd(16)}${entry.hex.padEnd(width)}${toWindowsPath(entry.path)}`),
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
  await new Promise((resolve) => setTimeout(resolve, Math.min(milliseconds, 60_000)));
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
  let okay = true;
  for (const { path } of expandPaths(targets, ctx)) {
    const node = nodes[path];
    if (!node) {
      fail(ctx, name, `Cannot find path '${toWindowsPath(path)}' because it does not exist.`);
      okay = false;
      continue;
    }
    out.push(
      "",
      `Name          : ${sanitizeForTerminal(node.name)}`,
      `FullName      : ${toWindowsPath(path)}`,
      `Mode          : ${modeOf(node, path === TRASH_PATH)}`,
      ...(node.kind === "file" ? [`Length        : ${fileLength(node) || 0}`, `Extension     : .${node.extension}`] : []),
      `CreationTime  : ${new Date(node.createdAt).toLocaleString()}`,
      `LastWriteTime : ${new Date(node.updatedAt).toLocaleString()}`,
      ...(node.kind === "file" && node.readonly ? ["IsReadOnly    : True"] : [])
    );
  }
  if (out.length) out.push("");
  return { out, ok: okay };
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
};

// ------------------------------------------------------------------ registry

const COMMANDS: Record<string, CommandSpec> = {
  "Get-ChildItem": { aliases: ["ls", "dir", "gci"], synopsis: "List the items in a folder.", syntax: "Get-ChildItem [[-Path] <string>] [-Recurse] [-Force] [-Name] [-Directory] [-File] [-Filter <string>]", run: getChildItem },
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
  "Sort-Object": { aliases: ["sort"], synopsis: "Sort piped lines.", syntax: "<command> | Sort-Object [-Descending] [-Unique]", run: sortObject },
  "Select-Object": { aliases: ["select"], synopsis: "Take the first or last piped lines.", syntax: "<command> | Select-Object [-First <int>] [-Last <int>] [-Skip <int>]", run: selectObject },
  "Measure-Object": { aliases: ["measure"], synopsis: "Count piped lines, words or characters.", syntax: "<command> | Measure-Object [-Line] [-Word] [-Character]", run: measureObject },
  "Get-Date": { aliases: ["date"], synopsis: "Show the current date and time.", syntax: "Get-Date", run: getDate },
  whoami: { aliases: [], synopsis: "Show the signed-in user.", syntax: "whoami", run: whoami },
  hostname: { aliases: [], synopsis: "Show the computer name.", syntax: "hostname", run: hostname },
  exit: { aliases: [], synopsis: "Close this terminal window.", syntax: "exit", run: exitShell },
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

const getCommand: CommandFn = (args) => {
  const filter = args[0] ? new RegExp(`^${args[0].replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`, "i") : null;
  const names = Object.keys(COMMANDS)
    .filter((name) => !filter || filter.test(name))
    .sort((a, b) => a.localeCompare(b));
  return ok([
    "",
    `${TABLE}${"CommandType".padEnd(16)}Name${RESET}`,
    `${TABLE}${"-----------".padEnd(16)}----${RESET}`,
    ...names.map((name) => `${(name.includes("-") ? "Cmdlet" : "Function").padEnd(16)}${name}`),
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
  "  wsl              Boot the Linux virtual machine   wsl",
  "",
  `${TABLE}Scripting${RESET}`,
  "  $x = 5           Variables, maths, comparisons    $x * 2, 'ab' * 3, 5 -gt 3",
  "  .\\script.ps1     Run a script from this drive     echo 'Write-Host hi -ForegroundColor Cyan' > a.ps1",
  "  Write-Host       Coloured output                  Write-Host hi -ForegroundColor Green",
  "  Test-Path, gi    Check or inspect a path          Test-Path Documents",
  "",
  `${TABLE}Shell${RESET}`,
  "  cls, history, Get-Date, whoami, Get-Command, Get-Alias, help <command>, exit",
  "  Tab completes commands and paths. Up/Down recalls history. Ctrl+C cancels, Ctrl+L clears.",
  "",
];

const getHelp: CommandFn = (args, _stdin, ctx, name) => {
  if (!args.length) return ok(HELP_OVERVIEW);
  const canonical = COMMAND_LOOKUP.get(args[0].toLowerCase());
  if (!canonical) return fail(ctx, name, `Get-Help could not find ${args[0]} in a help file in this session.`);
  const spec = COMMANDS[canonical];
  return ok([
    "",
    `${TABLE}NAME${RESET}`,
    `    ${canonical}`,
    "",
    `${TABLE}SYNOPSIS${RESET}`,
    `    ${spec.synopsis}`,
    "",
    `${TABLE}SYNTAX${RESET}`,
    `    ${spec.syntax}`,
    ...(spec.aliases.length ? ["", `${TABLE}ALIASES${RESET}`, `    ${spec.aliases.join(", ")}`] : []),
    "",
  ]);
};

COMMANDS["Get-Command"] = { aliases: ["gcm"], synopsis: "List available commands.", syntax: "Get-Command [<name>]", run: getCommand };
COMMANDS["Get-Alias"] = { aliases: ["gal", "alias"], synopsis: "List command aliases.", syntax: "Get-Alias", run: getAlias };
COMMANDS["Get-Help"] = { aliases: ["help", "man"], synopsis: "Show help for the shell or a command.", syntax: "Get-Help [<command>]", run: getHelp };
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
  if (text === null) return fail(ctx, getPathName(path), `Cannot read the script '${toWindowsPath(path)}'.`);

  let okay = true;
  const lines = text.split(/\r?\n/).slice(0, MAX_SCRIPT_LINES);
  for (const line of lines) {
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
  }
  return { out: [], ok: okay };
}

async function runStage(argv: string[], stdin: string[] | null, ctx: Ctx): Promise<Output> {
  // The call (&) and dot-source (.) operators just run what follows.
  const words = (argv[0] === "&" || argv[0] === ".") && argv.length > 1 ? argv.slice(1) : argv;
  const [rawName, ...args] = words;
  const key = rawName.toLowerCase();

  // PowerShell ships cd.. and cd\ as built-in functions.
  if (key === "cd.." || key === "cd\\" || key === "cd/") {
    return setLocation(key === "cd.." ? [".."] : ["~"], stdin, ctx, "Set-Location");
  }

  const canonical = COMMAND_LOOKUP.get(key);
  if (canonical) return COMMANDS[canonical].run(args, stdin, ctx, canonical);

  const executable = key.replace(/\.exe$/, "");
  if (EXECUTABLES[executable]) return launchExecutable(executable, args, ctx);

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

  return fail(
    ctx,
    rawName,
    `The term '${rawName}' is not recognized as a name of a cmdlet, function, script file, or executable program.\nCheck the spelling of the name, or if a path was included, verify that the path is correct and try again.`
  );
}

async function runPipeline(input: string, ctx: Ctx): Promise<{ out: string[]; ok: boolean }> {
  const parsed = parseStatements(tokenize(input), ctx);

  if (typeof parsed === "string") {
    fail(ctx, "ParserError", parsed);
    return { out: [], ok: false };
  }

  const collected: string[] = [];
  let success = true;
  for (const statement of parsed) {
    let stdin: string[] | null = null;
    let output: Output = ok();

    for (let index = 0; index < statement.stages.length; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      output = await runStage(statement.stages[index], stdin, ctx);
      if (index < statement.stages.length - 1) stdin = output.out.map(stripAnsi);
    }

    if (statement.redirect) {
      // eslint-disable-next-line no-await-in-loop
      const written = await writeContent(ctx, "Out-File", statement.redirect.target, output.out, statement.redirect.append);
      success &&= output.ok && written.ok;
    } else {
      collected.push(...output.out);
      success &&= output.ok;
    }
  }
  return { out: collected, ok: success };
}

const ASSIGNMENT = /^\$([A-Za-z_][A-Za-z0-9_]*)\s*(\+=|-=|=)\s*(.*)$/;

export async function runShellCommand(
  input: string,
  session: ShellSession,
  fs: ShellFileSystem,
  host: ShellHost = {},
  depth = 0
): Promise<ShellResult> {
  const ctx: Ctx = { session, fs, host, depth, lines: [], actions: [], clear: false };
  const trimmed = input.trim();

  // $name = value, $name += value: the value is an expression, or the output of a command.
  const assignment = trimmed.match(ASSIGNMENT);
  if (assignment && !assignment[3].startsWith("=")) {
    const [, rawName, operator, rhs] = assignment;
    const name = rawName.toLowerCase();
    if (["true", "false", "null", "home", "pwd", "host"].includes(name)) {
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
      const piped = await runPipeline(rhs, ctx);
      const lines = piped.out.map(stripAnsi).filter((line) => line.trim() !== "");
      value = lines.length === 1 ? lines[0] : lines;
    }

    const current = session.variables[name];
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

/** Tab completion for the word at the cursor: command names first, then paths. */
export function completeShellInput(line: string, cursor: number, session: ShellSession, nodes: FileSystemRecord): CompletionResult {
  const before = line.slice(0, cursor);
  let start = 0;
  let quote: string | null = null;

  for (let index = 0; index < before.length; index += 1) {
    const char = before[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (/\s/.test(char) || char === "|" || char === ";") start = index + 1;
  }

  const rawToken = before.slice(start);
  const quoted = rawToken.startsWith("'") || rawToken.startsWith('"');
  const token = quoted ? rawToken.slice(1) : rawToken;
  const head = before.slice(0, start).trimEnd();
  const commandPosition = head === "" || head.endsWith("|") || head.endsWith(";");

  let matches: Array<{ text: string; display: string }>;
  let isCommand = false;

  if (commandPosition && token !== "" && !/[\\/]/.test(token) && !token.startsWith(".") && !quoted) {
    isCommand = true;
    const lower = token.toLowerCase();
    matches = COMPLETABLE_COMMANDS()
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
      .filter((node) => node.path !== TRASH_PATH && node.name.toLowerCase().startsWith(prefix))
      .map((node) => {
        const suffix = node.kind === "directory" ? "\\" : "";
        return { text: `${directoryPart}${node.name}${suffix}`, display: `${node.name}${suffix}` };
      });
  }

  if (!matches.length) return { line, cursor, candidates: [] };

  const replace = (value: string, close: boolean) => {
    const needsQuotes = quoted || /\s/.test(value);
    const replacement = needsQuotes ? `'${value}${close ? "'" : ""}` : value;
    const trailing = isCommand && close ? " " : "";
    const nextLine = `${line.slice(0, start)}${replacement}${trailing}${line.slice(cursor)}`;
    return { line: nextLine, cursor: start + replacement.length + trailing.length, candidates: [] };
  };

  if (matches.length === 1) return replace(matches[0].text, true);

  const shared = commonPrefix(matches.map((match) => match.text));
  if (shared.length > token.replace(/\//g, "\\").length) return replace(shared, false);

  return { line, cursor, candidates: matches.map((match) => match.display) };
}
