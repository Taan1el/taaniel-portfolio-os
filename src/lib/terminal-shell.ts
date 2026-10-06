import { featuredProjects, profile, socialLinks } from "@/data/portfolio";
import { getParentPath, normalizePath } from "@/lib/filesystem";
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

export interface ShellSession {
  cwd: string;
  previousCwd: string | null;
  history: string[];
}

export interface ShellResult {
  lines: string[];
  clear: boolean;
  actions: TerminalAction[];
  success: boolean;
}

export function createShellSession(cwd = TERMINAL_HOME_PATH): ShellSession {
  return { cwd: normalizePath(cwd), previousCwd: null, history: [] };
}

interface Ctx {
  session: ShellSession;
  fs: ShellFileSystem;
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

function fail(ctx: Ctx, command: string, message: string): Output {
  message.split("\n").forEach((line, index) => {
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

function expandVariables(word: string, ctx: Ctx) {
  return word.replace(/\$(env:)?([A-Za-z_][A-Za-z0-9_]*)/gi, (_match, env: string | undefined, name: string) => {
    const key = name.toLowerCase();
    if (env) return environment(ctx)[key] ?? "";
    if (key === "home") return PROFILE_ROOT;
    if (key === "pwd") return toWindowsPath(ctx.session.cwd);
    if (key === "true") return "True";
    if (key === "false") return "False";
    if (key === "psversiontable") return `PSVersion ${POWERSHELL_VERSION}`;
    return "";
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
  if (nameOnly) return entries.map((node) => node.name);

  const header = `${"Mode".padEnd(15)}${"LastWriteTime".padStart(19)}${"Length".padStart(15)} Name`;
  const rule = `${"----".padEnd(15)}${"-------------".padStart(19)}${"------".padStart(15)} ----`;
  const rows = entries.map((node) => {
    const hidden = node.path === TRASH_PATH;
    const name = node.kind === "directory" ? `${DIRECTORY}${node.name}${RESET}` : node.name;
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
    let lines = text.length ? text.split(/\r?\n/) : [];
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
    files.forEach((file) => lines.push(`${prefix}${directories.length ? glyph.pipe : "    "}${file.name}`));
    lines.push(`${prefix}${directories.length ? glyph.pipeEnd : ""}`.trimEnd());
  }

  directories.forEach((node, index) => {
    const last = index === directories.length - 1;
    lines.push(`${prefix}${last ? glyph.last : glyph.branch}${node.name}`);
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
        text.split(/\r?\n/).forEach((line, index) => {
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

// ------------------------------------------------------------------ execution

async function runStage(argv: string[], stdin: string[] | null, ctx: Ctx): Promise<Output> {
  const [rawName, ...args] = argv;
  const key = rawName.toLowerCase();

  // PowerShell ships cd.. and cd\ as built-in functions.
  if (key === "cd.." || key === "cd\\" || key === "cd/") {
    return setLocation(key === "cd.." ? [".."] : ["~"], stdin, ctx, "Set-Location");
  }

  const canonical = COMMAND_LOOKUP.get(key);
  if (canonical) return COMMANDS[canonical].run(args, stdin, ctx, canonical);

  const executable = key.replace(/\.exe$/, "");
  if (EXECUTABLES[executable]) return launchExecutable(executable, args, ctx);

  // Typing a path to a document opens it, as in PowerShell.
  if (/[\\/.]/.test(rawName)) {
    const nodes = ctx.fs.getNodes();
    const path = resolveShellPath(rawName, ctx.session.cwd, nodes);
    if (nodes[path]) {
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

export async function runShellCommand(input: string, session: ShellSession, fs: ShellFileSystem): Promise<ShellResult> {
  const ctx: Ctx = { session, fs, lines: [], actions: [], clear: false };
  const parsed = parseStatements(tokenize(input), ctx);

  if (typeof parsed === "string") {
    fail(ctx, "ParserError", parsed);
    return { lines: ctx.lines, clear: false, actions: [], success: false };
  }

  let success = true;
  for (const statement of parsed) {
    let stdin: string[] | null = null;
    let output: Output = ok();

    for (let index = 0; index < statement.stages.length; index += 1) {
      output = await runStage(statement.stages[index], stdin, ctx);
      if (index < statement.stages.length - 1) stdin = output.out.map(stripAnsi);
    }

    if (statement.redirect) {
      const written = await writeContent(ctx, "Out-File", statement.redirect.target, output.out, statement.redirect.append);
      success &&= output.ok && written.ok;
    } else {
      ctx.lines.push(...output.out);
      success &&= output.ok;
    }
  }

  return { lines: ctx.lines, clear: ctx.clear, actions: ctx.actions, success };
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
