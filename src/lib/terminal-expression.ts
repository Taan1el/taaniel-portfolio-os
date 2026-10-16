import {
  formatNumberValue,
  getProperty,
  isShellDate,
  isShellObject,
  itemText,
  type PipelineItem,
} from "@/lib/terminal-objects";

/*
 * The shell's expression evaluator, hand written: numbers, strings, variables,
 * member access ($_.Length), arrays, + - * / %, parentheses and the operators
 * -eq -ne -gt -ge -lt -le -like -notlike -match -notmatch -contains -in
 * -replace -split -join -and -or -not. Nothing typed here is ever handed to
 * eval() or new Function(): text becomes tokens, tokens become a small tree,
 * and the tree is walked with hard limits on depth, work and string length.
 */

export type ShellValue = string | number | boolean | string[];

export class ExpressionError extends Error {}

/** Longest string an expression may build ('a' * 1e9 would otherwise freeze the tab). */
export const MAX_STRING_LENGTH = 1_000_000;
/** Deepest bracket, unary or subexpression nesting the evaluator follows. */
export const MAX_EXPRESSION_DEPTH = 64;
/** Nodes one command may evaluate in total, across every pipeline item. */
export const MAX_EXPRESSION_STEPS = 2_000_000;
/** Longest array an expression may build. */
const MAX_ARRAY_LENGTH = 100_000;

const SIZE_SUFFIX: Record<string, number> = { kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 };

const LOGICAL_OPERATORS = ["-and", "-or"];
const COMPARISON_ONLY = [
  "-eq",
  "-ne",
  "-gt",
  "-ge",
  "-lt",
  "-le",
  "-like",
  "-notlike",
  "-match",
  "-notmatch",
  "-contains",
  "-notcontains",
  "-in",
  "-notin",
  "-replace",
  "-split",
  "-join",
];
export const COMPARISON_OPERATORS = [...COMPARISON_ONLY, ...LOGICAL_OPERATORS];

/** "1kb", "2.5mb": a number with a size suffix, as PowerShell reads it. Null for anything else. */
export function parseSizeLiteral(text: string): number | null {
  const match = text.trim().match(/^(\d+(?:\.\d+)?)(kb|mb|gb|tb)$/i);
  return match ? parseFloat(match[1]) * SIZE_SUFFIX[match[2].toLowerCase()] : null;
}

export function unescapeBacktick(char: string) {
  if (char === "n") return "\n";
  if (char === "t") return "\t";
  if (char === "0") return "";
  return char;
}

export function formatNumber(value: number) {
  return formatNumberValue(value);
}

export function wildcardRegex(pattern: string) {
  return new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i");
}

// --------------------------------------------------------------------- lexer

type ExprToken =
  | { t: "num"; v: number }
  | { t: "str"; v: string; interpolate: boolean }
  | { t: "var"; v: string; members: string[] }
  | { t: "op"; v: string }
  | { t: "lp" }
  | { t: "rp" };

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
    if (comparison && (COMPARISON_OPERATORS.includes(comparison) || comparison === "-not")) {
      tokens.push({ t: "op", v: comparison });
      i += comparison.length;
      continue;
    }

    if (char === "!") {
      tokens.push({ t: "op", v: "-not" });
      i += 1;
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

    // $name, $env:NAME and member access: $_.Length, $x.Count.
    const variable = rest.match(/^\$((?:env:)?[A-Za-z_][A-Za-z0-9_]*)((?:\.[A-Za-z_][A-Za-z0-9_]*)*)/i);
    if (variable) {
      tokens.push({ t: "var", v: variable[1], members: variable[2].split(".").filter(Boolean) });
      i += variable[0].length;
      continue;
    }

    if ("+-*/%,".includes(char)) {
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

// -------------------------------------------------------------------- parser

export type ExprNode =
  | { k: "lit"; v: number }
  | { k: "str"; v: string; interpolate: boolean }
  | { k: "var"; name: string; members: string[] }
  | { k: "array"; items: ExprNode[] }
  | { k: "unary"; op: "-" | "-not"; arg: ExprNode }
  | { k: "binary"; op: string; left: ExprNode; right: ExprNode };

/** A parsed expression, a parse error to show, or undefined when the text is not an expression at all. */
export type ParseResult = { node: ExprNode } | { error: string } | undefined;

export function parseExpression(text: string): ParseResult {
  const tokens = lexExpression(text);
  if (!tokens || tokens.length === 0) return undefined;
  let position = 0;
  let depth = 0;

  const peek = () => tokens[position];
  const take = () => tokens[position++];
  const peekOp = (values: string[]) => {
    const token = peek();
    return token?.t === "op" && values.includes(token.v) ? token.v : null;
  };
  const enter = () => {
    depth += 1;
    if (depth > MAX_EXPRESSION_DEPTH) throw new ExpressionError("The expression is nested too deeply.");
  };
  const leave = () => {
    depth -= 1;
  };

  const primary = (): ExprNode => {
    const token = take();
    if (!token) throw new ExpressionError("You must provide a value expression following the operator.");
    if (token.t === "num") return { k: "lit", v: token.v };
    if (token.t === "str") return { k: "str", v: token.v, interpolate: token.interpolate };
    if (token.t === "var") return { k: "var", name: token.v, members: token.members };
    if (token.t === "lp") {
      enter();
      const inner = logical();
      leave();
      if (take()?.t !== "rp") throw new ExpressionError("Missing closing ')' in expression.");
      return inner;
    }
    throw new ExpressionError("You must provide a value expression following the operator.");
  };

  // 'a','b','c' builds an array, as the comma operator does.
  const list = (): ExprNode => {
    const first = primary();
    if (!peekOp([","])) return first;
    const items = [first];
    while (peekOp([","])) {
      take();
      items.push(primary());
      if (items.length > MAX_ARRAY_LENGTH) throw new ExpressionError("The array is too long.");
    }
    return { k: "array", items };
  };

  const unary = (): ExprNode => {
    const op = peekOp(["-", "-not"]);
    if (op) {
      take();
      enter();
      const arg = unary();
      leave();
      return { k: "unary", op: op as "-" | "-not", arg };
    }
    return list();
  };

  const term = (): ExprNode => {
    let node = unary();
    for (let op = peekOp(["*", "/", "%"]); op; op = peekOp(["*", "/", "%"])) {
      take();
      node = { k: "binary", op, left: node, right: unary() };
    }
    return node;
  };

  const additive = (): ExprNode => {
    let node = term();
    for (let op = peekOp(["+", "-"]); op; op = peekOp(["+", "-"])) {
      take();
      node = { k: "binary", op, left: node, right: term() };
    }
    return node;
  };

  const comparison = (): ExprNode => {
    let node = additive();
    for (let op = peekOp(COMPARISON_ONLY); op; op = peekOp(COMPARISON_ONLY)) {
      take();
      node = { k: "binary", op, left: node, right: additive() };
    }
    return node;
  };

  // -and and -or share the lowest precedence, so `a -gt 1 -and b -lt 5` compares first.
  function logical(): ExprNode {
    let node = comparison();
    for (let op = peekOp(LOGICAL_OPERATORS); op; op = peekOp(LOGICAL_OPERATORS)) {
      take();
      node = { k: "binary", op, left: node, right: comparison() };
    }
    return node;
  }

  try {
    const node = logical();
    if (position !== tokens.length) return undefined;
    return { node };
  } catch (error) {
    if (error instanceof ExpressionError) return { error: error.message };
    return undefined;
  }
}

// ----------------------------------------------------------------- evaluation

export interface ExpressionEnv {
  /** Look up $name, $env:NAME and the session's variables. */
  readVariable: (name: string) => ShellValue | undefined;
  /** Shared by every evaluation one command makes, so no pipeline can run away. */
  budget: { steps: number };
}

/** What `$_` (and `$PSItem`) mean while a script block runs over a pipeline item. */
export interface ExpressionScope {
  item: PipelineItem;
}

export function toNumber(value: ShellValue): number {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const text = Array.isArray(value) ? value.join("") : value;
  if (text.trim() !== "" && Number.isFinite(Number(text))) return Number(text);
  throw new ExpressionError(`Cannot convert value "${text}" to type "System.Int32". Error: "Input string was not in a correct format."`);
}

export function toText(value: ShellValue): string {
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return formatNumber(value);
  if (Array.isArray(value)) return value.join(" ");
  return value;
}

/** PowerShell truthiness: empty strings, 0 and empty arrays are false; the string "False" is not. */
export function toBool(value: ShellValue): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function readMember(value: unknown, member: string): unknown {
  const lower = member.toLowerCase();
  if (Array.isArray(value)) return lower === "count" || lower === "length" ? value.length : undefined;
  if (isShellObject(value) || typeof value === "string") return getProperty(value, member);
  return undefined;
}

/** A property value or pipeline item as something an expression can compute with. */
export function propertyToShellValue(value: unknown): ShellValue {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map(String);
  if (isShellObject(value)) return value.text;
  // Dates compare as timestamps, so -gt and -lt order them.
  if (isShellDate(value)) return value.time;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return "";
}

function isItemVariable(name: string) {
  const lower = name.toLowerCase();
  return lower === "_" || lower === "psitem";
}

function textOf(value: ShellValue) {
  return toText(value);
}

function checkLength(text: string) {
  if (text.length > MAX_STRING_LENGTH) throw new ExpressionError("The string is too long to build here.");
  return text;
}

export function compareOperands(operator: string, left: ShellValue, right: ShellValue): ShellValue {
  const numeric = typeof left === "number";
  const a = numeric ? left : textOf(left).toLowerCase();
  const b = numeric ? toNumber(right) : textOf(right).toLowerCase();

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
      return wildcardRegex(textOf(right)).test(textOf(left));
    case "-notlike":
      return !wildcardRegex(textOf(right)).test(textOf(left));
    case "-match":
    case "-notmatch": {
      let matched: boolean;
      try {
        matched = new RegExp(textOf(right), "i").test(textOf(left));
      } catch {
        throw new ExpressionError(`The regular expression pattern ${textOf(right)} is not valid.`);
      }
      return operator === "-match" ? matched : !matched;
    }
    case "-contains":
    case "-notcontains":
    case "-in":
    case "-notin": {
      const collection = operator === "-contains" || operator === "-notcontains" ? left : right;
      const needle = operator === "-contains" || operator === "-notcontains" ? right : left;
      const entries = Array.isArray(collection) ? collection : [collection];
      const found = entries.some((entry) => textOf(entry).toLowerCase() === textOf(needle).toLowerCase());
      return operator === "-contains" || operator === "-in" ? found : !found;
    }
    case "-replace": {
      const [pattern = "", replacement = ""] = Array.isArray(right) ? right : [textOf(right)];
      try {
        return checkLength(textOf(left).replace(new RegExp(pattern, "gi"), replacement));
      } catch (error) {
        if (error instanceof ExpressionError) throw error;
        throw new ExpressionError(`The regular expression pattern ${pattern} is not valid.`);
      }
    }
    case "-split": {
      const text = textOf(left);
      try {
        return text.split(new RegExp(textOf(right), "i")).slice(0, MAX_ARRAY_LENGTH);
      } catch {
        throw new ExpressionError(`The regular expression pattern ${textOf(right)} is not valid.`);
      }
    }
    case "-join":
      return checkLength((Array.isArray(left) ? left : [textOf(left)]).join(textOf(right)));
    default:
      throw new ExpressionError(`Unexpected token '${operator}' in expression or statement.`);
  }
}

export function applyArithmetic(operator: string, left: ShellValue, right: ShellValue): ShellValue {
  if (operator === "+") {
    if (Array.isArray(left)) {
      const next = [...left, ...(Array.isArray(right) ? right : [toText(right)])];
      if (next.length > MAX_ARRAY_LENGTH) throw new ExpressionError("The array is too long.");
      return next;
    }
    if (typeof left === "string") return checkLength(left + toText(right));
    return toNumber(left) + toNumber(right);
  }
  if (operator === "*") {
    if (typeof left === "string") {
      const times = Math.max(0, Math.floor(toNumber(right)));
      if (left.length * times > MAX_STRING_LENGTH) throw new ExpressionError("The string is too long to build here.");
      return left.repeat(times);
    }
    return toNumber(left) * toNumber(right);
  }
  const a = toNumber(left);
  const b = toNumber(right);
  if ((operator === "/" || operator === "%") && b === 0) throw new ExpressionError("Attempted to divide by zero.");
  if (operator === "-") return a - b;
  if (operator === "/") return a / b;
  return a % b;
}

function spend(env: ExpressionEnv) {
  env.budget.steps += 1;
  if (env.budget.steps > MAX_EXPRESSION_STEPS) {
    throw new ExpressionError("The expression took too long to evaluate and was stopped.");
  }
}

/** The pipeline item `$_` stands for, when the whole node is just `$_`. */
export function isBareItemNode(node: ExprNode) {
  return node.k === "var" && node.members.length === 0 && isItemVariable(node.name);
}

export function evaluateNode(node: ExprNode, env: ExpressionEnv, scope?: ExpressionScope, depth = 0): ShellValue {
  spend(env);

  switch (node.k) {
    case "lit":
      return node.v;
    case "str":
      return node.interpolate ? interpolateString(node.v, env, scope, depth) : node.v;
    case "var": {
      let value: unknown =
        scope && isItemVariable(node.name) ? scope.item : (env.readVariable(node.name) ?? "");
      for (const member of node.members) value = readMember(value, member);
      return propertyToShellValue(value);
    }
    case "array": {
      const items: string[] = [];
      for (const item of node.items) {
        const value = evaluateNode(item, env, scope, depth);
        if (Array.isArray(value)) items.push(...value);
        else items.push(toText(value));
      }
      return items;
    }
    case "unary": {
      const value = evaluateNode(node.arg, env, scope, depth);
      return node.op === "-not" ? !toBool(value) : -toNumber(value);
    }
    case "binary": {
      if (node.op === "-and") return toBool(evaluateNode(node.left, env, scope, depth)) && toBool(evaluateNode(node.right, env, scope, depth));
      if (node.op === "-or") return toBool(evaluateNode(node.left, env, scope, depth)) || toBool(evaluateNode(node.right, env, scope, depth));
      const left = evaluateNode(node.left, env, scope, depth);
      const right = evaluateNode(node.right, env, scope, depth);
      return "+-*/%".includes(node.op) ? applyArithmetic(node.op, left, right) : compareOperands(node.op, left, right);
    }
  }
}

// -------------------------------------------------------------- interpolation

function findClosingParen(text: string, openIndex: number) {
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];
    if (char === "'" || char === '"') {
      const close = text.indexOf(char, index + 1);
      if (close === -1) return -1;
      index = close;
    } else if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function expandPlain(segment: string, env: ExpressionEnv, scope?: ExpressionScope) {
  return segment.replace(/\$(env:)?([A-Za-z_][A-Za-z0-9_]*)/gi, (_match, envPrefix: string | undefined, name: string) => {
    if (!envPrefix && scope && isItemVariable(name)) return itemText(scope.item);
    const value = env.readVariable(`${envPrefix ?? ""}${name}`);
    if (value === undefined) return "";
    return Array.isArray(value) ? value.join(" ") : typeof value === "boolean" ? (value ? "True" : "False") : String(value);
  });
}

/**
 * Expand $name, $env:NAME, $_ and $( subexpression ) inside text. A $(...)
 * that is not a plain expression (a command, say) is left as typed.
 * Throws ExpressionError when an expression inside fails.
 */
export function interpolateString(text: string, env: ExpressionEnv, scope?: ExpressionScope, depth = 0): string {
  if (!text.includes("$")) return text;
  let out = "";
  let index = 0;

  while (index < text.length) {
    const start = text.indexOf("$(", index);
    out += expandPlain(text.slice(index, start === -1 ? text.length : start), env, scope);
    if (start === -1) break;

    const close = findClosingParen(text, start + 1);
    if (close === -1) {
      out += text.slice(start);
      break;
    }

    if (depth + 1 > MAX_EXPRESSION_DEPTH) throw new ExpressionError("The expression is nested too deeply.");
    const parsed = parseExpression(text.slice(start + 2, close));
    if (!parsed) {
      out += text.slice(start, close + 1);
    } else if ("error" in parsed) {
      throw new ExpressionError(parsed.error);
    } else {
      out += checkLength(toText(evaluateNode(parsed.node, env, scope, depth + 1)));
    }
    index = close + 1;
  }

  return out;
}
