import { getParentPath } from "@/lib/filesystem";
import { TRASH_PATH } from "@/lib/system-workspace";
import {
  evaluateNode,
  ExpressionError,
  parseExpression,
  wildcardRegex,
  type ExpressionEnv,
} from "@/lib/terminal-expression";
import {
  completeShellInput,
  isExecutableName,
  processNumber,
  runShellCommand,
  sanitizeForTerminal,
  stripAnsi,
  toDisplayPath,
  type CompletionResult,
  type ShellFileSystem,
  type ShellHost,
  type ShellResult,
  type ShellSession,
  type TerminalAction,
} from "@/lib/terminal-shell";
import { childrenOf, findChild, PROFILE_ROOT, resolveShellPath, SHELL_HOST, SHELL_USER, toWindowsPath } from "@/lib/windows-path";
import type { FileSystemRecord, VirtualNode } from "@/types/system";

/*
 * A small Command Prompt lookalike over the same virtual filesystem as the
 * PowerShell one. It is its own interpreter - cmd's syntax (%VAR%, &, &&, ||,
 * dir, /switches, errorlevels) is not PowerShell's - but it leans on the
 * PowerShell engine for what both do the same way: moving files, launching
 * apps, pinging. Nothing typed is ever evaluated as code.
 */

export const CMD_VERSION = "11.0.1 (portfolio build)";
const VOLUME_LABEL = "Taaniel OS";
const VOLUME_SERIAL = "7A1C-3E5D";
/** What `dir` reports as free: a browser has no disk to measure, so this is a fixed, plausible figure. */
const FREE_BYTES = 128_849_018_880;

const MAX_LOOP_ITERATIONS = 1000;
const MAX_LINE_LENGTH = 8191;

/** Errorlevels: 0 worked, 1 failed, 9009 is "not recognized". */
const OK = 0;
const FAILED = 1;
const NOT_RECOGNIZED = 9009;

export function formatCmdPrompt(cwd: string) {
  return `${toDisplayPath(cwd)}>`;
}

/** What a new Command Prompt tab prints first. */
export function getCmdBanner(): string[] {
  return [`Taaniel OS [Version ${CMD_VERSION}]`, "\x1b[90mType HELP to see what this prompt can do.\x1b[0m", ""];
}

// -------------------------------------------------------------------- context

interface CmdCtx {
  session: ShellSession;
  fs: ShellFileSystem;
  host: ShellHost;
  depth: number;
  lines: string[];
  actions: TerminalAction[];
  clear: boolean;
  /** Output of the previous command in a pipe, for find, findstr, sort and more. */
  stdin: string[] | null;
  /** Whether `echo` with no text reports the command echo as on. */
  echo: boolean;
}

type Builtin = (rest: string, ctx: CmdCtx) => Promise<number> | number;

/** Own-key lookup: typing `constructor` must never find something on Object.prototype. */
function own<T>(record: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

function say(ctx: CmdCtx, ...lines: string[]) {
  lines.forEach((line) => ctx.lines.push(sanitizeForTerminal(line)));
}

function complain(ctx: CmdCtx, message: string) {
  say(ctx, ...message.split("\n"));
  return FAILED;
}

// ---------------------------------------------------------------- environment

const pad2 = (value: number) => String(value).padStart(2, "0");
const dateText = (date: Date) => `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
const timeText = (date: Date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function randomNumber() {
  const buffer = new Uint16Array(1);
  globalThis.crypto?.getRandomValues(buffer);
  return buffer[0] % 32768;
}

/** Variables every prompt starts with, computed fresh each time they are read. */
function builtinEnvironment(ctx: CmdCtx): Record<string, string> {
  const now = new Date();
  return {
    USERNAME: SHELL_USER,
    USERPROFILE: PROFILE_ROOT,
    COMPUTERNAME: SHELL_HOST,
    HOMEDRIVE: "C:",
    HOMEPATH: `\\Users\\${SHELL_USER}`,
    OS: "Taaniel_OS",
    TEMP: `${PROFILE_ROOT}\\AppData\\Local\\Temp`,
    TMP: `${PROFILE_ROOT}\\AppData\\Local\\Temp`,
    PROMPT: "$P$G",
    CD: toDisplayPath(ctx.session.cwd),
    DATE: `${WEEKDAYS[now.getDay()]} ${dateText(now)}`,
    TIME: `${timeText(now)}:${pad2(now.getSeconds())}.${pad2(Math.floor(now.getMilliseconds() / 10))}`,
    RANDOM: String(randomNumber()),
  };
}

/** The variables `set` creates live in the session, lower-cased: cmd ignores case. */
function readEnvironment(name: string, ctx: CmdCtx): string | undefined {
  const key = name.toLowerCase();
  const stored = own(ctx.session.variables, key);
  if (stored !== undefined) return Array.isArray(stored) ? stored.join(" ") : String(stored);
  if (key === "errorlevel") return "0";
  const builtin = builtinEnvironment(ctx);
  const match = Object.keys(builtin).find((entry) => entry.toLowerCase() === key);
  return match ? builtin[match] : undefined;
}

/** %NAME% becomes its value; a name that is not set stays as typed, as at the interactive prompt. */
function expandEnvironment(text: string, ctx: CmdCtx) {
  return text.replace(/%([^%\s"]+)%/g, (match, name: string) => readEnvironment(name, ctx) ?? match);
}

// -------------------------------------------------------------------- parsing

/** One piece of a command line, and the operator that joins it to the piece before. */
interface Segment {
  join: "" | "&" | "&&" | "||" | "|";
  text: string;
}

/** Split a line on & && || and |, honouring "quotes" and the ^ escape. */
function splitSegments(line: string): Segment[] {
  const segments: Segment[] = [];
  let quoted = false;
  let current = "";
  let join: Segment["join"] = "";

  const push = (next: Segment["join"]) => {
    segments.push({ join, text: current });
    current = "";
    join = next;
  };

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') quoted = !quoted;
    if (!quoted && char === "^" && index + 1 < line.length) {
      current += line[index + 1];
      index += 1;
      continue;
    }
    if (!quoted && (char === "&" || char === "|")) {
      const double = line[index + 1] === char;
      if (double) index += 1;
      push(char === "&" ? (double ? "&&" : "&") : double ? "||" : "|");
      continue;
    }
    current += char;
  }
  push("");
  return segments.filter((segment) => segment.text.trim());
}

/** Words of an argument string, with "quotes" removed. Spaces, commas and semicolons separate words. */
function splitWords(text: string): string[] {
  const words: string[] = [];
  let current = "";
  let inWord = false;
  let quoted = false;
  for (const char of text) {
    if (char === '"') {
      quoted = !quoted;
      inWord = true;
      continue;
    }
    if (!quoted && /[\s,;]/.test(char)) {
      if (inWord) words.push(current);
      current = "";
      inWord = false;
      continue;
    }
    current += char;
    inWord = true;
  }
  if (inWord) words.push(current);
  return words;
}

interface Redirect {
  target: string;
  append: boolean;
  /** 2> sends the error stream: here, errors only matter for 2>nul. */
  errors: boolean;
}

/** Pull > and >> redirections (and 2>) off a command, outside quotes. */
function extractRedirects(text: string): { command: string; redirects: Redirect[] } {
  const redirects: Redirect[] = [];
  let command = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') quoted = !quoted;
    if (!quoted && char === ">") {
      const errors = /(^|\s)2$/.test(command);
      if (errors) command = command.slice(0, -1);
      const append = text[index + 1] === ">";
      let cursor = index + (append ? 2 : 1);
      while (text[cursor] === " ") cursor += 1;
      let target = "";
      let targetQuoted = false;
      while (cursor < text.length && (targetQuoted || !/[\s<>]/.test(text[cursor]))) {
        if (text[cursor] === '"') targetQuoted = !targetQuoted;
        else target += text[cursor];
        cursor += 1;
      }
      redirects.push({ target, append, errors });
      index = cursor - 1;
      continue;
    }
    command += char;
  }
  return { command: command.trim(), redirects };
}

/** `cd..`, `dir/w` and `echo.` run: a command name ends at the first delimiter. */
function splitCommand(text: string): { name: string; rest: string } {
  const trimmed = text.trim();
  const match = trimmed.match(/^([^\s\\/.:=+,;()[\]"<>|&]+)([\s\S]*)$/);
  if (!match) return { name: "", rest: trimmed };
  return { name: match[1], rest: match[2] };
}

// ---------------------------------------------------------------------- paths

const nodesOf = (ctx: CmdCtx): FileSystemRecord => ctx.fs.getNodes();
const resolve = (input: string, ctx: CmdCtx) => resolveShellPath(input, ctx.session.cwd, nodesOf(ctx));
const hasWildcard = (text: string) => /[*?]/.test(text);
/** /y, /q, /s, /t:... - one letter. A longer /Documents is a path in the original /unix style. */
const isSwitchWord = (word: string) => /^\/[a-z?](?::\S*)?$/i.test(word);
const lastSegment = (path: string) => path.split("/").filter(Boolean).at(-1) ?? "";

/** A path argument that may carry * and ? in its last part: every path it matches. */
function expandPattern(input: string, ctx: CmdCtx): string[] {
  if (!hasWildcard(input)) return [resolve(input, ctx)];
  const normalized = input.replace(/\//g, "\\");
  const split = normalized.lastIndexOf("\\");
  const directory = resolve(split >= 0 ? normalized.slice(0, split + 1) : ".", ctx);
  const regex = wildcardRegex(split >= 0 ? normalized.slice(split + 1) : normalized);
  return childrenOf(nodesOf(ctx), directory)
    .filter((node) => regex.test(node.name))
    .map((node) => node.path);
}

function byteLength(node: VirtualNode): number {
  if (node.kind !== "file") return 0;
  if (typeof node.size === "number") return node.size;
  return typeof node.content === "string" ? node.content.length : 0;
}

function textOf(node: VirtualNode): string | null {
  if (node.kind !== "file" || typeof node.content !== "string") return null;
  return node.content.replace(/\r?\n$/, "");
}

function holdsReadOnly(nodes: FileSystemRecord, path: string) {
  const prefix = path === "/" ? "/" : `${path}/`;
  return Object.values(nodes).some((node) => node.kind === "file" && node.readonly === true && (node.path === path || node.path.startsWith(prefix)));
}

function readableFile(path: string, ctx: CmdCtx): { text: string } | { error: string } {
  const node = nodesOf(ctx)[path];
  if (!node) return { error: "The system cannot find the file specified." };
  if (node.kind === "directory") return { error: "Access is denied." };
  const text = textOf(node);
  if (text === null) return { error: `'${node.name}' is not a text file.` };
  return { text };
}

// ----------------------------------------------------------------- delegation

const psQuote = (value: string) => `'${value.replace(/'/g, "''")}'`;

/**
 * Run something the PowerShell engine already does the same way. Its output is
 * dropped when `quiet` and it failed, because its error wording is PowerShell's.
 */
async function viaPowerShell(command: string, ctx: CmdCtx, quiet = false): Promise<boolean> {
  const result = await runShellCommand(command, ctx.session, ctx.fs, ctx.host, ctx.depth + 1);
  if (result.interrupted) throw new InterruptedCmd();
  // stripAnsi only knows CSI colours; sanitizing removes what is left, OSC sequences included.
  if (!quiet || result.success) result.lines.forEach((line) => ctx.lines.push(sanitizeForTerminal(stripAnsi(line))));
  ctx.actions.push(...result.actions);
  if (result.clear) ctx.clear = true;
  return result.success;
}

class InterruptedCmd extends Error {}

/** Commands the PowerShell engine answers as cmd would. */
const DELEGATED = new Set(["systeminfo", "ping", "curl", "tree"]);

// -------------------------------------------------------------------- builtins

const BUILTINS: Record<string, Builtin> = {};
const ALIASES: Record<string, string> = {
  chdir: "cd",
  md: "mkdir",
  rd: "rmdir",
  erase: "del",
  rename: "ren",
};

function register(names: string[], run: Builtin) {
  names.forEach((name) => {
    BUILTINS[name] = run;
  });
}

register(["echo"], (rest, ctx) => {
  // echo. and echo: print the rest of the line (a blank one, usually).
  if (/^[.:(]/.test(rest)) {
    say(ctx, rest.slice(1));
    return OK;
  }
  const text = rest.startsWith(" ") ? rest.slice(1) : rest;
  if (!text.trim()) say(ctx, `ECHO is ${ctx.echo ? "on" : "off"}.`);
  else if (/^on$/i.test(text.trim())) ctx.echo = true;
  else if (/^off$/i.test(text.trim())) ctx.echo = false;
  else say(ctx, text);
  return OK;
});

register(["cls"], (_rest, ctx) => {
  ctx.clear = true;
  ctx.lines.length = 0;
  return OK;
});
register(["ver"], (_rest, ctx) => {
  say(ctx, "", `Taaniel OS [Version ${CMD_VERSION}]`, "");
  return OK;
});
register(["vol"], (_rest, ctx) => {
  say(ctx, ` Volume in drive C is ${VOLUME_LABEL}`, ` Volume Serial Number is ${VOLUME_SERIAL}`);
  return OK;
});
register(["exit"], (_rest, ctx) => {
  ctx.actions.push({ type: "exit" });
  return OK;
});
register(["title"], (rest, ctx) => {
  const title = rest.replace(/"/g, "").trim();
  if (title) ctx.actions.push({ type: "set-title", title: title.slice(0, 60) });
  return OK;
});
register(["whoami"], (_rest, ctx) => {
  say(ctx, `${SHELL_HOST.toLowerCase()}\\${SHELL_USER.toLowerCase()}`);
  return OK;
});
register(["hostname"], (_rest, ctx) => {
  say(ctx, SHELL_HOST);
  return OK;
});
// Accepted so scripts written for the real thing carry on; they change nothing here.
register(["rem", "setlocal", "endlocal", "prompt", "mode", "chcp"], () => OK);
register(["pause"], (_rest, ctx) => {
  say(ctx, "Press any key to continue . . .");
  return OK;
});
register(["color"], (_rest, ctx) => {
  say(ctx, "Colours come from the terminal's colour scheme here. Press Ctrl+, to change it.");
  return OK;
});

register(["date"], (rest, ctx) => {
  const now = new Date();
  const today = `${WEEKDAYS[now.getDay()]} ${dateText(now)}`;
  say(ctx, /\/t/i.test(rest) ? today : `The current date is: ${today}`);
  return OK;
});
register(["time"], (rest, ctx) => {
  const now = new Date();
  const precise = `${timeText(now)}:${pad2(now.getSeconds())}.${pad2(Math.floor(now.getMilliseconds() / 10))}`;
  say(ctx, /\/t/i.test(rest) ? timeText(now) : `The current time is: ${precise}`);
  return OK;
});

register(["cd"], (rest, ctx) => {
  let argument = rest.trim();
  if (/^\/d\b/i.test(argument)) argument = argument.slice(2).trim();
  const target = argument.replace(/"/g, "").trim();
  if (!target) {
    say(ctx, toWindowsPath(ctx.session.cwd));
    return OK;
  }
  // A bare drive letter just "switches drive": there is only C:.
  if (/^[a-z]:$/i.test(target)) return OK;
  const path = resolve(target, ctx);
  if (nodesOf(ctx)[path]?.kind !== "directory") return complain(ctx, "The system cannot find the path specified.");
  if (path !== ctx.session.cwd) {
    ctx.session.previousCwd = ctx.session.cwd;
    ctx.session.cwd = path;
  }
  return OK;
});

register(["pushd"], (rest, ctx) => {
  const target = rest.replace(/"/g, "").trim();
  if (!target) {
    say(ctx, toWindowsPath(ctx.session.cwd));
    return OK;
  }
  const path = resolve(target, ctx);
  if (nodesOf(ctx)[path]?.kind !== "directory") return complain(ctx, "The system cannot find the path specified.");
  ctx.session.locationStack.push(ctx.session.cwd);
  ctx.session.cwd = path;
  return OK;
});
register(["popd"], (_rest, ctx) => {
  const target = ctx.session.locationStack.pop();
  if (target && nodesOf(ctx)[target]?.kind === "directory") ctx.session.cwd = target;
  return OK;
});

// ---- dir

interface DirOptions {
  bare: boolean;
  recurse: boolean;
  /** /a:d lists folders only, /a:-d files only, /a:h includes the hidden Recycle Bin. */
  attributes: string;
}

const grouped = (value: number) => value.toLocaleString("en-US");

function entryLine(node: VirtualNode) {
  const when = new Date(node.updatedAt);
  const field = node.kind === "directory" ? "<DIR>".padEnd(14) : grouped(byteLength(node)).padStart(14);
  return `${dateText(when)}  ${timeText(when)}    ${field} ${node.name}`;
}

const fileSummary = (count: number, bytes: number) => `${String(count).padStart(16)} File(s) ${grouped(bytes).padStart(14)} bytes`;
const folderSummary = (count: number) => `${String(count).padStart(16)} Dir(s)  ${grouped(FREE_BYTES).padStart(15)} bytes free`;

register(["dir"], (rest, ctx) => {
  const nodes = nodesOf(ctx);
  const options: DirOptions = { bare: false, recurse: false, attributes: "" };
  const targets: string[] = [];

  for (const arg of splitWords(rest)) {
    const flag = arg.match(/^\/([a-z0-9-]+)(?::(.*))?$/i);
    // /Media is a path in the original /unix style, not a switch, when it exists.
    if (flag && !nodes[resolve(arg, ctx)]) {
      const name = flag[1].toLowerCase();
      if (name === "b") options.bare = true;
      else if (name === "s") options.recurse = true;
      else if (name.startsWith("a")) options.attributes = (flag[2] ?? name.slice(1)).toLowerCase();
      else if (!/^(o[a-z-]*|w|p|q|l|c|d|n|x|r|4|t[a-z]*)$/.test(name)) return complain(ctx, `Invalid switch - "${flag[1]}".`);
      continue;
    }
    targets.push(arg);
  }

  const keep = (node: VirtualNode) => {
    if (node.path === TRASH_PATH && !options.attributes.includes("h")) return false;
    if (options.attributes.startsWith("d") && node.kind !== "directory") return false;
    if (options.attributes.startsWith("-d") && node.kind !== "file") return false;
    return true;
  };

  const blocks: string[][] = [];
  const totals = { files: 0, bytes: 0, folders: 0 };
  const bare: string[] = [];

  /** One "Directory of" block. `filtered` blocks (a pattern or a file) leave out . and .. */
  const listBlock = (directory: string, entries: VirtualNode[], filtered: boolean) => {
    const when = new Date(nodes[directory]?.updatedAt ?? Date.now());
    const dots = (name: string) => `${dateText(when)}  ${timeText(when)}    ${"<DIR>".padEnd(14)} ${name}`;
    const showDots = !filtered && !options.attributes.startsWith("-d");
    const files = entries.filter((node) => node.kind === "file");
    const bytes = files.reduce((sum, node) => sum + byteLength(node), 0);
    const folders = entries.length - files.length + (showDots ? 2 : 0);
    totals.files += files.length;
    totals.bytes += bytes;
    totals.folders += folders;
    blocks.push([
      ` Directory of ${toWindowsPath(directory)}`,
      "",
      ...(showDots ? [dots("."), dots("..")] : []),
      ...entries.map(entryLine),
      fileSummary(files.length, bytes),
      folderSummary(folders),
    ]);
  };

  const visit = (directory: string, filter?: RegExp) => {
    const entries = childrenOf(nodes, directory).filter((node) => keep(node) && (!filter || filter.test(node.name)));
    if (options.bare) entries.forEach((node) => bare.push(options.recurse ? toWindowsPath(node.path) : node.name));
    else if (entries.length || !filter) listBlock(directory, entries, Boolean(filter));
    if (options.recurse) {
      childrenOf(nodes, directory)
        .filter((node) => node.kind === "directory" && node.path !== TRASH_PATH)
        .forEach((node) => visit(node.path, filter));
    }
  };

  let missing: string | null = null;
  for (const target of targets.length ? targets : ["."]) {
    if (hasWildcard(target)) {
      const normalized = target.replace(/\//g, "\\");
      const split = normalized.lastIndexOf("\\");
      const directory = resolve(split >= 0 ? normalized.slice(0, split + 1) : ".", ctx);
      if (nodes[directory]?.kind !== "directory") {
        missing = directory;
        continue;
      }
      const before = blocks.length + bare.length;
      visit(directory, wildcardRegex(split >= 0 ? normalized.slice(split + 1) : normalized));
      if (blocks.length + bare.length === before) missing = directory;
      continue;
    }

    const path = resolve(target, ctx);
    const node = nodes[path];
    if (!node) {
      missing = getParentPath(path);
    } else if (node.kind === "directory") {
      visit(path);
    } else if (options.bare) {
      bare.push(node.name);
    } else {
      listBlock(getParentPath(path), [node], true);
    }
  }

  if (options.bare) {
    if (!bare.length) return complain(ctx, "File Not Found");
    say(ctx, ...bare);
    return OK;
  }

  say(ctx, ` Volume in drive C is ${VOLUME_LABEL}`, ` Volume Serial Number is ${VOLUME_SERIAL}`, "");
  if (missing !== null && !blocks.length) {
    say(ctx, ` Directory of ${toWindowsPath(missing)}`, "", "File Not Found");
    return FAILED;
  }
  blocks.forEach((block, index) => {
    if (index > 0) say(ctx, "");
    say(ctx, ...block);
  });
  if (options.recurse) {
    say(ctx, "", "     Total Files Listed:", fileSummary(totals.files, totals.bytes), folderSummary(totals.folders));
  }
  return missing !== null ? FAILED : OK;
});

// ---- reading

register(["type"], (rest, ctx) => {
  const names = splitWords(rest);
  if (!names.length) return complain(ctx, "The syntax of the command is incorrect.");
  const paths = names.flatMap((name) => expandPattern(name, ctx));
  if (!paths.length) return complain(ctx, "The system cannot find the file specified.");
  let code = OK;
  paths.forEach((path) => {
    const read = readableFile(path, ctx);
    if ("error" in read) {
      code = complain(ctx, read.error);
      return;
    }
    if (paths.length > 1) say(ctx, "", lastSegment(path), "", "");
    say(ctx, ...(read.text.length ? read.text.split("\n") : []));
  });
  return code;
});

register(["more"], (rest, ctx) => {
  if (!splitWords(rest).filter((word) => !isSwitchWord(word)).length) {
    say(ctx, ...(ctx.stdin ?? []));
    return OK;
  }
  return BUILTINS.type(rest, ctx);
});

/** The text sources a search reads: the named files, or the piped output when none are named. */
function searchSources(operands: string[], ctx: CmdCtx, fileLabel: (path: string) => string): Array<{ label: string; lines: string[] }> | string {
  if (!operands.length) return [{ label: "", lines: ctx.stdin ?? [] }];
  const sources: Array<{ label: string; lines: string[] }> = [];
  for (const operand of operands) {
    const paths = expandPattern(operand, ctx);
    if (!paths.length) return `File not found - ${operand.toUpperCase()}`;
    for (const path of paths) {
      const read = readableFile(path, ctx);
      if ("error" in read) return `File not found - ${lastSegment(path).toUpperCase()}`;
      sources.push({ label: fileLabel(path), lines: read.text.split("\n") });
    }
  }
  return sources;
}

register(["find"], (rest, ctx) => {
  const words = splitWords(rest);
  const switches = words.filter(isSwitchWord).map((word) => word.toLowerCase());
  const operands = words.filter((word) => !isSwitchWord(word));
  const needle = operands.shift();
  if (needle === undefined) return complain(ctx, "FIND: Parameter format not correct");
  const ignoreCase = switches.includes("/i");
  const invert = switches.includes("/v");
  const matches = (line: string) => (ignoreCase ? line.toLowerCase().includes(needle.toLowerCase()) : line.includes(needle)) !== invert;

  const sources = searchSources(operands, ctx, (path) => lastSegment(path).toUpperCase());
  if (typeof sources === "string") return complain(ctx, sources);

  let total = 0;
  for (const source of sources) {
    const hits = source.lines.filter(matches);
    total += hits.length;
    if (switches.includes("/c")) {
      say(ctx, source.label ? `---------- ${source.label}: ${hits.length}` : String(hits.length));
      continue;
    }
    if (source.label) say(ctx, `---------- ${source.label}`);
    source.lines.forEach((line, index) => {
      if (matches(line)) say(ctx, switches.includes("/n") ? `[${index + 1}]${line}` : line);
    });
  }
  return total || switches.includes("/c") ? OK : FAILED;
});

register(["findstr"], (rest, ctx) => {
  const words = splitWords(rest);
  const phraseWord = words.find((word) => /^\/c:/i.test(word));
  const phrase = phraseWord?.slice(3);
  const flags = words.filter(isSwitchWord).map((word) => word.toLowerCase());
  const operands = words.filter((word) => !isSwitchWord(word) && word !== phraseWord);
  const patternText = phrase ?? operands.shift();
  if (patternText === undefined) return complain(ctx, "FINDSTR: Bad command line");

  const ignoreCase = flags.includes("/i");
  const regex = flags.includes("/r");
  // Several words mean "any of them", as findstr reads them.
  const terms = phrase !== undefined || regex ? [patternText] : patternText.split(/\s+/).filter(Boolean);
  let tests: Array<(line: string) => boolean>;
  try {
    tests = terms.map((term) => {
      const matcher = regex ? new RegExp(term, ignoreCase ? "i" : "") : null;
      return (line: string) => (matcher ? matcher.test(line) : ignoreCase ? line.toLowerCase().includes(term.toLowerCase()) : line.includes(term));
    });
  } catch {
    return complain(ctx, "FINDSTR: Bad command line");
  }
  const invert = flags.includes("/v");
  const matches = (line: string) => tests.some((test) => test(line)) !== invert;

  const sources = searchSources(operands, ctx, lastSegment);
  if (typeof sources === "string") return complain(ctx, sources.replace("File not found - ", "FINDSTR: Cannot open "));

  let total = 0;
  for (const source of sources) {
    source.lines.forEach((line, index) => {
      if (!matches(line)) return;
      total += 1;
      say(ctx, `${sources.length > 1 ? `${source.label}:` : ""}${flags.includes("/n") ? `${index + 1}:` : ""}${line}`);
    });
  }
  return total ? OK : FAILED;
});

register(["sort"], (rest, ctx) => {
  const words = splitWords(rest);
  const names = words.filter((word) => !isSwitchWord(word));
  let lines = ctx.stdin ?? [];
  if (names.length) {
    const read = readableFile(resolve(names[0], ctx), ctx);
    if ("error" in read) return complain(ctx, read.error);
    lines = read.text.split("\n");
  }
  const sorted = [...lines].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  say(ctx, ...(words.some((word) => /^\/r$/i.test(word)) ? sorted.reverse() : sorted));
  return OK;
});

// ---- creating, copying and removing

async function makeDirectory(path: string, ctx: CmdCtx): Promise<boolean> {
  let current = "";
  for (const segment of path.split("/").filter(Boolean)) {
    current = `${current}/${segment}`;
    const existing = nodesOf(ctx)[current];
    // eslint-disable-next-line no-await-in-loop
    if (!existing) await ctx.fs.mkdir(current);
    else if (existing.kind !== "directory") return false;
  }
  return true;
}

register(["mkdir"], async (rest, ctx) => {
  const targets = splitWords(rest);
  if (!targets.length) return complain(ctx, "The syntax of the command is incorrect.");
  let code = OK;
  for (const target of targets) {
    const path = resolve(target, ctx);
    if (nodesOf(ctx)[path]) code = complain(ctx, `A subdirectory or file ${target} already exists.`);
    // eslint-disable-next-line no-await-in-loop
    else if (!(await makeDirectory(path, ctx))) code = complain(ctx, "The system cannot find the path specified.");
  }
  return code;
});

register(["rmdir"], async (rest, ctx) => {
  const words = splitWords(rest);
  const recursive = words.some((word) => /^\/s$/i.test(word));
  const quiet = words.some((word) => /^\/q$/i.test(word));
  const targets = words.filter((word) => !isSwitchWord(word));
  if (!targets.length) return complain(ctx, "The syntax of the command is incorrect.");
  let code = OK;

  for (const target of targets) {
    const path = resolve(target, ctx);
    const nodes = nodesOf(ctx);
    const node = nodes[path];
    if (!node) code = complain(ctx, "The system cannot find the file specified.");
    else if (node.kind !== "directory") code = complain(ctx, "The directory name is invalid.");
    else if (path === "/" || path === TRASH_PATH || holdsReadOnly(nodes, path)) code = complain(ctx, "Access is denied.");
    else if (path === ctx.session.cwd || ctx.session.cwd.startsWith(`${path}/`)) {
      code = complain(ctx, "The process cannot access the file because it is being used by another process.");
    } else if (childrenOf(nodes, path).length && !recursive) code = complain(ctx, "The directory is not empty.");
    else if (recursive && !quiet) {
      // cmd would ask "Are you sure (Y/N)?"; this prompt cannot, so it asks for /q instead.
      code = complain(ctx, `${target}, Are you sure (Y/N)? This prompt cannot ask: add /q to remove it (it goes to the Recycle Bin).`);
    } else {
      // eslint-disable-next-line no-await-in-loop
      await ctx.fs.deleteNode(path);
    }
  }
  return code;
});

register(["del"], async (rest, ctx) => {
  const targets = splitWords(rest).filter((word) => !isSwitchWord(word));
  if (!targets.length) return complain(ctx, "The syntax of the command is incorrect.");
  let code = OK;

  for (const target of targets) {
    const paths = expandPattern(target, ctx).filter((path) => nodesOf(ctx)[path]);
    if (!paths.length) {
      code = complain(ctx, `Could Not Find ${toWindowsPath(resolve(target, ctx))}`);
      continue;
    }
    for (const path of paths) {
      const node = nodesOf(ctx)[path];
      if (node.kind === "directory" || path === TRASH_PATH || (node.kind === "file" && node.readonly)) {
        code = complain(ctx, "Access is denied.");
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await ctx.fs.deleteNode(path);
    }
  }
  return code;
});

register(["copy"], async (rest, ctx) => {
  const words = splitWords(rest);
  const overwrite = words.some((word) => /^\/y$/i.test(word));
  const operands = words.filter((word) => !isSwitchWord(word));
  if (!operands.length) return complain(ctx, "The syntax of the command is incorrect.");
  const destinationArg = operands.length > 1 ? (operands.at(-1) as string) : ".";
  const sources = (operands.length > 1 ? operands.slice(0, -1) : operands).flatMap((name) => expandPattern(name, ctx));
  const nodes = nodesOf(ctx);
  if (!sources.length || sources.some((path) => nodes[path]?.kind !== "file")) return complain(ctx, "The system cannot find the file specified.");

  const destination = resolve(destinationArg, ctx);
  const intoFolder = nodes[destination]?.kind === "directory";
  let copied = 0;
  for (const source of sources) {
    const target = intoFolder ? `${destination === "/" ? "" : destination}/${nodes[source].name}` : destination;
    if (target === source) {
      complain(ctx, "The file cannot be copied onto itself.");
      continue;
    }
    if (nodesOf(ctx)[target] && !overwrite) {
      say(ctx, `Overwrite ${toWindowsPath(target)}? This prompt cannot ask: run the command again with /y to overwrite.`);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    if (await viaPowerShell(`Copy-Item ${psQuote(toWindowsPath(source))} ${psQuote(toWindowsPath(destination))}`, ctx, true)) copied += 1;
    else complain(ctx, "Access is denied.");
  }
  say(ctx, `${String(copied).padStart(9)} file(s) copied.`);
  return copied ? OK : FAILED;
});

register(["move"], async (rest, ctx) => {
  const words = splitWords(rest).filter((word) => !isSwitchWord(word));
  if (words.length < 2) return complain(ctx, "The syntax of the command is incorrect.");
  const destinationArg = words.at(-1) as string;
  const sources = words.slice(0, -1).flatMap((name) => expandPattern(name, ctx));
  if (!sources.length || sources.some((path) => !nodesOf(ctx)[path])) return complain(ctx, "The system cannot find the file specified.");

  let moved = 0;
  let kind = "file";
  for (const source of sources) {
    if (nodesOf(ctx)[source].kind === "directory") kind = "dir";
    if (holdsReadOnly(nodesOf(ctx), source) || source === "/" || source === TRASH_PATH) {
      complain(ctx, "Access is denied.");
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    if (await viaPowerShell(`Move-Item ${psQuote(toWindowsPath(source))} ${psQuote(destinationArg)}`, ctx, true)) moved += 1;
    else complain(ctx, "Cannot move the item: the destination already has one with that name, or it is in use.");
  }
  say(ctx, `${String(moved).padStart(9)} ${kind}(s) moved.`);
  return moved ? OK : FAILED;
});

register(["ren"], async (rest, ctx) => {
  const words = splitWords(rest);
  if (words.length < 2) return complain(ctx, "The syntax of the command is incorrect.");
  const path = resolve(words[0], ctx);
  const nodes = nodesOf(ctx);
  if (!nodes[path]) return complain(ctx, "The system cannot find the file specified.");
  if (/[\\/]/.test(words[1])) return complain(ctx, "The syntax of the command is incorrect.");
  const collision = findChild(nodes, getParentPath(path), words[1]);
  if (collision && collision.path !== path) return complain(ctx, "A duplicate file name exists, or the file cannot be found.");
  if (path === "/" || path === TRASH_PATH || holdsReadOnly(nodes, path)) return complain(ctx, "Access is denied.");
  const renamed = await ctx.fs.rename(path, words[1]);
  if (ctx.session.cwd === path || ctx.session.cwd.startsWith(`${path}/`)) ctx.session.cwd = renamed + ctx.session.cwd.slice(path.length);
  return OK;
});

// ---- environment variables

register(["set"], (rest, ctx) => {
  const argument = rest.trim();
  const variables = ctx.session.variables;

  const arithmetic = argument.match(/^\/a\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/i) ?? argument.match(/^\/a\s+(.+)$/i);
  if (arithmetic) {
    const name = arithmetic.length === 3 ? arithmetic[1] : null;
    // Bare names in set /a are variables: turn each into $name for the evaluator.
    const source = (arithmetic.length === 3 ? arithmetic[2] : arithmetic[1]).replace(/(^|[^$\w])([A-Za-z_][A-Za-z0-9_]*)/g, "$1$$$2");
    const parsed = parseExpression(source);
    if (!parsed || "error" in parsed) return complain(ctx, "Missing operator.");
    const env: ExpressionEnv = {
      readVariable: (variable) => {
        const text = readEnvironment(variable, ctx);
        return text !== undefined && text.trim() !== "" && Number.isFinite(Number(text)) ? Number(text) : text;
      },
      budget: { steps: 0 },
    };
    try {
      const value = evaluateNode(parsed.node, env);
      const whole = Math.trunc(Number(Array.isArray(value) ? NaN : value));
      if (!Number.isFinite(whole)) return complain(ctx, "Invalid number. Numeric constants are either decimal (17), hexadecimal (0x11), or octal (021).");
      if (name) variables[name.toLowerCase()] = String(whole);
      say(ctx, String(whole));
      return OK;
    } catch (error) {
      return complain(ctx, error instanceof ExpressionError ? error.message : "Missing operator.");
    }
  }

  const assignment = argument.match(/^"?([^=\s"][^=]*)=(.*?)"?$/);
  if (assignment) {
    const name = assignment[1].trim().toLowerCase();
    if (!name || name === "errorlevel") return complain(ctx, "The syntax of the command is incorrect.");
    if (assignment[2] === "") delete variables[name];
    else variables[name] = assignment[2].slice(0, MAX_LINE_LENGTH);
    return OK;
  }

  const everything: Record<string, string> = { ...builtinEnvironment(ctx) };
  Object.entries(variables).forEach(([key, value]) => {
    if (key !== "errorlevel") everything[key.toUpperCase()] = Array.isArray(value) ? value.join(" ") : String(value);
  });
  const prefix = argument.toUpperCase();
  const names = Object.keys(everything)
    .filter((key) => key.startsWith(prefix))
    .sort((a, b) => a.localeCompare(b));
  if (argument && !names.length) return complain(ctx, `Environment variable ${argument} not defined`);
  say(ctx, ...names.map((key) => `${key}=${everything[key]}`));
  return OK;
});

// ---- the system

register(["tasklist"], (_rest, ctx) => {
  const processes = ctx.host.listProcesses?.() ?? [];
  say(
    ctx,
    "",
    `${"Image Name".padEnd(25)} ${"PID".padStart(8)} ${"Session Name".padEnd(16)} ${"Session#".padStart(11)} ${"Mem Usage".padStart(12)}`,
    `${"=".repeat(25)} ${"=".repeat(8)} ${"=".repeat(16)} ${"=".repeat(11)} ${"=".repeat(12)}`,
    ...processes.map(
      (process) =>
        `${process.name.slice(0, 25).padEnd(25)} ${String(processNumber(process.id)).padStart(8)} ${"Console".padEnd(16)} ${"1".padStart(11)} ${"N/A".padStart(12)}`
    )
  );
  return OK;
});

register(["taskkill"], (rest, ctx) => {
  const words = splitWords(rest);
  const take = (flag: string) => {
    const index = words.findIndex((word) => word.toLowerCase() === flag);
    return index >= 0 ? words[index + 1] : undefined;
  };
  const image = take("/im");
  const pid = take("/pid");
  if (image === undefined && pid === undefined) return complain(ctx, 'ERROR: Invalid syntax. Type "TASKKILL /?" for usage.');

  const targets = (ctx.host.listProcesses?.() ?? []).filter((process) =>
    pid !== undefined ? processNumber(process.id) === Number(pid) : wildcardRegex(image as string).test(process.name)
  );
  if (!targets.length) return complain(ctx, `ERROR: The process "${pid ?? image}" not found.`);
  targets.forEach((process) => {
    ctx.host.stopProcess?.(process.id);
    say(ctx, `SUCCESS: Sent termination signal to the process "${process.name}" with PID ${processNumber(process.id)}.`);
  });
  return OK;
});

register(["ipconfig"], (_rest, ctx) => {
  const offline = ctx.host.isOffline?.() || (typeof navigator !== "undefined" && navigator.onLine === false);
  say(
    ctx,
    "",
    "Taaniel OS IP Configuration",
    "",
    "Browser connection:",
    `   Connection status . . . . . . : ${offline ? "Offline" : "Online"}`,
    "   Note  . . . . . . . . . . . . : Web pages cannot read this device's network addresses."
  );
  return OK;
});

const HELP: Record<string, string> = {
  cd: "Displays the name of or changes the current directory.",
  cls: "Clears the screen.",
  copy: "Copies files to another location. Add /y to overwrite.",
  date: "Displays the date: DATE /T.",
  del: "Deletes files (they go to the Recycle Bin).",
  dir: "Lists files and subdirectories. Switches: /B /S /A:D.",
  echo: "Displays messages, or turns command echoing on or off.",
  exit: "Quits this tab.",
  find: "Searches for text in a file or piped output. /I /V /C /N.",
  findstr: 'Searches for strings in files or piped output. /I /N /V /R /C:"text".',
  help: "Provides help information for commands.",
  hostname: "Prints the name of the computer.",
  ipconfig: "Shows the browser's connection status.",
  mkdir: "Creates a directory, with any missing parents.",
  more: "Displays the contents of a file or piped output.",
  move: "Moves files or directories.",
  popd: "Returns to the directory saved by PUSHD.",
  pushd: "Saves the current directory, then changes it.",
  ren: "Renames a file or directory.",
  rmdir: "Removes a directory. RMDIR /S /Q removes it and what it holds.",
  set: "Displays or sets variables: SET NAME=value, SET /A x=1+2.",
  sort: "Sorts lines of a file or piped output. /R reverses.",
  start: "Opens a file, folder, URL or app: START file.pdf.",
  taskkill: "Closes a running app: TASKKILL /IM notes or /PID 1234.",
  tasklist: "Lists the apps running on this desktop.",
  time: "Displays the time: TIME /T.",
  title: "Renames this tab.",
  tree: "Draws a folder tree. /F lists files, /A uses ASCII.",
  type: "Displays the contents of a text file.",
  ver: "Displays the Taaniel OS version.",
  vol: "Displays the disk volume label and serial number.",
  whoami: "Displays the signed-in user.",
};

register(["help"], (rest, ctx) => {
  const topic = rest.trim().toLowerCase();
  if (topic) {
    const description = own(HELP, own(ALIASES, topic) ?? topic);
    if (!description) return complain(ctx, "This command is not supported by the help utility.");
    say(ctx, description, "");
    return OK;
  }
  say(
    ctx,
    "For more information on a specific command, type HELP command-name",
    ...Object.entries(HELP).map(([name, text]) => `${name.toUpperCase().padEnd(10)}${text}`),
    "",
    "Anything else: notepad, calc, explorer, powershell, wsl, ms-settings:display.",
    "F6 moves focus out of the terminal (Tab and Esc belong to the prompt). Ctrl+, opens settings."
  );
  return OK;
});

// ---- start, if, for

register(["start"], async (rest, ctx) => {
  const trimmed = rest.trim();
  if (!trimmed) {
    ctx.actions.push({ type: "open-tab", profile: "cmd" });
    return OK;
  }
  const words = splitWords(trimmed);
  // start "title" target: a quoted first word followed by more is the window title.
  const targets = trimmed.startsWith('"') && words.length > 1 ? words.slice(1) : words;
  return (await viaPowerShell(`Start-Process ${targets.map(psQuote).join(" ")}`, ctx)) ? OK : FAILED;
});

register(["if"], (rest, ctx) => {
  let text = rest.trim();
  let negate = false;
  if (/^not\s/i.test(text)) {
    negate = true;
    text = text.slice(3).trim();
  }
  const unquote = (value: string) => value.replace(/^"|"$/g, "");

  let condition: boolean;
  let remainder: string;
  let match = text.match(/^exist\s+("[^"]*"|\S+)\s+([\s\S]+)$/i);
  if (match) {
    condition = Boolean(nodesOf(ctx)[resolve(unquote(match[1]), ctx)]);
    remainder = match[2];
  } else if ((match = text.match(/^errorlevel\s+(\d+)\s+([\s\S]+)$/i))) {
    condition = Number(readEnvironment("errorlevel", ctx)) >= Number(match[1]);
    remainder = match[2];
  } else if ((match = text.match(/^(\/i\s+)?("[^"]*"|\S+?)\s*==\s*("[^"]*"|\S+)\s+([\s\S]+)$/i))) {
    const [left, right] = [unquote(match[2]), unquote(match[3])];
    condition = match[1] ? left.toLowerCase() === right.toLowerCase() : left === right;
    remainder = match[4];
  } else {
    return complain(ctx, "The syntax of the command is incorrect.");
  }

  const [thenPart, elsePart] = remainder.split(/\s+else\s+/i);
  const chosen = condition !== negate ? thenPart : elsePart;
  return chosen ? executeLine(chosen.replace(/^\(|\)$/g, "").trim(), ctx) : OK;
});

register(["for"], async (rest, ctx) => {
  const counted = rest.match(/^\s*\/l\s+%+([A-Za-z])\s+in\s+\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\)\s+do\s+([\s\S]+)$/i);
  const listed = rest.match(/^\s*%+([A-Za-z])\s+in\s+\(([^)]*)\)\s+do\s+([\s\S]+)$/i);
  let variable: string;
  let items: string[];
  let body: string;

  if (counted) {
    const [, name, start, step, end, command] = counted;
    const by = Number(step) || 1;
    items = [];
    for (let value = Number(start); (by > 0 ? value <= Number(end) : value >= Number(end)) && items.length < MAX_LOOP_ITERATIONS; value += by) {
      items.push(String(value));
    }
    variable = name;
    body = command;
  } else if (listed) {
    variable = listed[1];
    body = listed[3];
    items = splitWords(listed[2])
      .flatMap((word) => (hasWildcard(word) ? expandPattern(word, ctx).map(lastSegment) : [word]))
      .slice(0, MAX_LOOP_ITERATIONS);
  } else {
    return complain(ctx, "The syntax of the command is incorrect.");
  }

  let code = OK;
  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop
    code = await executeLine(body.replace(new RegExp(`%+${variable}`, "g"), item), ctx);
  }
  return code;
});

// ----------------------------------------------------------------- execution

/** One command: a built-in, something the PowerShell engine answers, a script, a document, or nothing. */
async function runSimple(text: string, stdin: string[] | null, ctx: CmdCtx): Promise<{ code: number; lines: string[] }> {
  const { command, redirects } = extractRedirects(text.replace(/^\s*@/, ""));
  const firstWord = command.split(/\s+/)[0] ?? "";
  const before = ctx.lines.length;
  ctx.stdin = stdin;
  let code: number;

  if (!command || /^(::|rem$)/i.test(firstWord)) {
    code = OK;
  } else if (/^[a-z]:$/i.test(firstWord)) {
    // Switching drive: there is only C:.
    code = OK;
  } else if (isExecutableName(firstWord)) {
    const rest = command.slice(firstWord.length);
    code = (await viaPowerShell(`${firstWord} ${splitWords(rest).map(psQuote).join(" ")}`.trim(), ctx)) ? OK : FAILED;
  } else {
    const { name, rest } = splitCommand(command);
    const key = (own(ALIASES, name.toLowerCase()) ?? name.toLowerCase()) as string;
    const builtin = own(BUILTINS, key);
    if (DELEGATED.has(key)) {
      code = (await viaPowerShell(`${key} ${rest.trim()}`.trim(), ctx)) ? OK : FAILED;
    } else if (builtin) {
      code = await builtin(rest, ctx);
    } else {
      code = await runProgram(command, ctx);
    }
  }

  let produced = ctx.lines.splice(before);
  for (const redirect of redirects) {
    if (redirect.errors) {
      // 2>nul hides what a failing command printed.
      if (redirect.target.toLowerCase() === "nul" && code !== OK) produced = [];
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    if (await writeRedirect(redirect, produced, ctx)) produced = [];
    else code = FAILED;
  }
  return { code, lines: produced };
}

/** > and >>: write a command's output to a file (nul discards it). Reports why when it cannot. */
async function writeRedirect(redirect: Redirect, lines: string[], ctx: CmdCtx): Promise<boolean> {
  if (redirect.target.toLowerCase() === "nul") return true;
  const nodes = nodesOf(ctx);
  const path = resolve(redirect.target, ctx);
  const node = nodes[path];
  if (node?.kind === "directory" || (node?.kind === "file" && (node.readonly || textOf(node) === null))) {
    say(ctx, "Access is denied.");
    return false;
  }
  if (nodes[getParentPath(path)]?.kind !== "directory") {
    say(ctx, "The system cannot find the path specified.");
    return false;
  }
  const text = lines.join("\n");
  const existing = node?.kind === "file" ? (node.content ?? "") : "";
  await ctx.fs.writeFile(path, redirect.append && existing ? `${existing}${existing.endsWith("\n") ? "" : "\n"}${text}` : text);
  return true;
}

/** A name that is not a built-in: a document to open, or nothing at all. */
async function runProgram(command: string, ctx: CmdCtx): Promise<number> {
  const first = splitWords(command)[0] ?? "";
  const nodes = nodesOf(ctx);

  if (/[\\/.]/.test(first)) {
    const path = resolve(first, ctx);
    const node = nodes[path];
    if (node) {
      // Typing the path to a document opens it, as at the real prompt.
      ctx.actions.push({ type: "open-path", path });
      return OK;
    }
  }

  say(ctx, `'${first}' is not recognized as an internal or external command,`, "operable program or batch file.");
  return NOT_RECOGNIZED;
}

/** Run one command line: pieces joined by &, && and ||, each possibly a pipe. */
async function executeLine(line: string, ctx: CmdCtx): Promise<number> {
  const segments = splitSegments(line);
  let code = OK;
  let index = 0;

  while (index < segments.length) {
    // A pipeline is this piece and every following one joined with |.
    let end = index + 1;
    while (end < segments.length && segments[end].join === "|") end += 1;
    const join = segments[index].join;
    const skip = (join === "&&" && code !== OK) || (join === "||" && code === OK);

    if (!skip) {
      let stdin: string[] | null = null;
      for (let part = index; part < end; part += 1) {
        // eslint-disable-next-line no-await-in-loop
        const result = await runSimple(expandEnvironment(segments[part].text, ctx), stdin, ctx);
        code = result.code;
        if (part < end - 1) stdin = result.lines;
        else ctx.lines.push(...result.lines);
      }
      ctx.session.variables.errorlevel = String(code);
    }
    index = end;
  }
  return code;
}

/** Run one line at the Command Prompt. Resolves with what to print, the actions to carry out, and whether it worked. */
export async function runCmdCommand(
  input: string,
  session: ShellSession,
  fs: ShellFileSystem,
  host: ShellHost = {},
  depth = 0
): Promise<ShellResult> {
  const ctx: CmdCtx = { session, fs, host, depth, lines: [], actions: [], clear: false, stdin: null, echo: true };
  const line = input.trim().slice(0, MAX_LINE_LENGTH);

  try {
    if (host.signal?.aborted) throw new InterruptedCmd();
    const code = line ? await executeLine(line, ctx) : OK;
    return { lines: ctx.lines, clear: ctx.clear, actions: ctx.actions, success: code === OK };
  } catch (error) {
    if (error instanceof InterruptedCmd) return { lines: [], clear: false, actions: [], success: false, interrupted: true };
    throw error;
  }
}

// ----------------------------------------------------- completion, highlighting

const COMMAND_NAMES = () =>
  Array.from(new Set([...Object.keys(BUILTINS), ...Object.keys(ALIASES), ...DELEGATED, "notepad", "calc", "mspaint", "explorer", "powershell", "wsl"])).sort();

/** Tab completion: command names first, then paths. Commands are separated by & and |. */
export function completeCmdInput(line: string, cursor: number, session: ShellSession, nodes: FileSystemRecord): CompletionResult {
  return completeShellInput(line, cursor, session, nodes, { commands: COMMAND_NAMES(), separators: "|&" });
}

/** The Command Prompt does not colour what is typed. */
export function highlightCmdInput(line: string) {
  return line;
}
